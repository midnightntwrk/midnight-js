/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Buffer } from 'buffer';
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

export type PrivateStoragePasswordProvider = () => string | Promise<string>;

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS_V1 = 100000;
const PBKDF2_ITERATIONS_V2 = 600000;
const ENCRYPTION_VERSION_V1 = 1;
const ENCRYPTION_VERSION_V2 = 2;
const CURRENT_ENCRYPTION_VERSION = ENCRYPTION_VERSION_V2;

const VERSION_PREFIX_LENGTH = 1;
const HEADER_LENGTH = VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

interface EncryptedComponents {
  version: number;
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encrypted: Buffer;
}

const extractEncryptedComponents = (data: Buffer): EncryptedComponents => {
  if (data.length < HEADER_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  const version = data[0];
  if (version !== ENCRYPTION_VERSION_V1 && version !== ENCRYPTION_VERSION_V2) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  return {
    version,
    salt: data.subarray(VERSION_PREFIX_LENGTH, VERSION_PREFIX_LENGTH + SALT_LENGTH),
    iv: data.subarray(VERSION_PREFIX_LENGTH + SALT_LENGTH, VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH),
    authTag: data.subarray(
      VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH,
      VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    ),
    encrypted: data.subarray(HEADER_LENGTH)
  };
};

const getIterationsForVersion = (version: number): number => {
  switch (version) {
    case ENCRYPTION_VERSION_V1:
      return PBKDF2_ITERATIONS_V1;
    case ENCRYPTION_VERSION_V2:
      return PBKDF2_ITERATIONS_V2;
    default:
      throw new Error(`Unsupported encryption version: ${version}`);
  }
};

const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

export class StorageEncryption {
  private readonly encryptionKey: Buffer;
  private readonly salt: Buffer;
  private readonly passwordHash: string;

  constructor(password: string, existingSalt?: Buffer) {
    this.salt = existingSalt ?? randomBytes(SALT_LENGTH);
    this.encryptionKey = this.deriveKey(password, this.salt, PBKDF2_ITERATIONS_V2);
    this.passwordHash = hashPassword(password);
  }

  private deriveKey(password: string, salt: Buffer, iterations: number): Buffer {
    return pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
  }

  verifyPassword(password: string): boolean {
    const inputHash = Buffer.from(hashPassword(password), 'hex');
    const storedHash = Buffer.from(this.passwordHash, 'hex');
    return timingSafeEqual(inputHash, storedHash);
  }

  encrypt(data: string): string {
    const plaintext = Buffer.from(data, 'utf-8');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const version = Buffer.from([CURRENT_ENCRYPTION_VERSION]);
    const result = Buffer.concat([version, this.salt, iv, authTag, encrypted]);

    return result.toString('base64');
  }

  decrypt(encryptedData: string): string {
    const data = Buffer.from(encryptedData, 'base64');
    const { version, salt, iv, authTag, encrypted } = extractEncryptedComponents(data);

    if (version === ENCRYPTION_VERSION_V1) {
      throw new Error('V1 encrypted data requires password for decryption. Use decryptWithPassword() instead.');
    }

    if (!this.salt.equals(salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  decryptWithPassword(encryptedData: string, password: string): string {
    const data = Buffer.from(encryptedData, 'base64');
    const { version, salt, iv, authTag, encrypted } = extractEncryptedComponents(data);

    if (!this.salt.equals(salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const iterations = getIterationsForVersion(version);
    const decryptionKey = version === CURRENT_ENCRYPTION_VERSION
      ? this.encryptionKey
      : this.deriveKey(password, salt, iterations);

    const decipher = createDecipheriv(ALGORITHM, decryptionKey, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  static isEncrypted(data: string): boolean {
    try {
      const buffer = Buffer.from(data, 'base64');
      const version = buffer[0];
      return buffer.length >= HEADER_LENGTH &&
        (version === ENCRYPTION_VERSION_V1 || version === ENCRYPTION_VERSION_V2);
    } catch {
      return false;
    }
  }

  static getVersion(encryptedData: string): number {
    const buffer = Buffer.from(encryptedData, 'base64');
    if (buffer.length < 1) {
      throw new Error('Invalid encrypted data: too short');
    }
    return buffer[0];
  }

  getSalt(): Buffer {
    return this.salt;
  }
}

const MIN_PASSWORD_LENGTH = 16;
const MIN_CHARACTER_CLASSES = 3;
const MAX_CONSECUTIVE_REPEATED = 3;
const MIN_SEQUENTIAL_LENGTH = 4;

const countCharacterClasses = (password: string): number => {
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/[0-9]/.test(password)) count++;
  if (/[^a-zA-Z0-9]/.test(password)) count++;
  return count;
};

const hasRepeatedCharacters = (password: string): boolean => {
  let consecutiveCount = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      consecutiveCount++;
      if (consecutiveCount > MAX_CONSECUTIVE_REPEATED) {
        return true;
      }
    } else {
      consecutiveCount = 1;
    }
  }
  return false;
};

const hasSequentialPattern = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();

  for (let i = 0; i <= lowerPassword.length - MIN_SEQUENTIAL_LENGTH; i++) {
    let ascendingCount = 1;
    let descendingCount = 1;

    for (let j = 1; j < MIN_SEQUENTIAL_LENGTH; j++) {
      const currentCode = lowerPassword.charCodeAt(i + j);
      const prevCode = lowerPassword.charCodeAt(i + j - 1);

      if (currentCode === prevCode + 1) {
        ascendingCount++;
      } else {
        ascendingCount = 1;
      }

      if (currentCode === prevCode - 1) {
        descendingCount++;
      } else {
        descendingCount = 1;
      }

      if (ascendingCount >= MIN_SEQUENTIAL_LENGTH || descendingCount >= MIN_SEQUENTIAL_LENGTH) {
        return true;
      }
    }
  }
  return false;
};

const validatePassword = (password: string): void => {
  if (!password) {
    throw new Error(
      'Password is required for private state encryption.\n' +
        'Please provide a password via privateStoragePasswordProvider in the configuration.'
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long. Current length: ${password.length}`
    );
  }

  if (hasRepeatedCharacters(password)) {
    throw new Error(
      `Password contains too many repeated characters (more than ${MAX_CONSECUTIVE_REPEATED} identical in a row)`
    );
  }

  const characterClasses = countCharacterClasses(password);
  if (characterClasses < MIN_CHARACTER_CLASSES) {
    throw new Error(
      `Password must contain at least ${MIN_CHARACTER_CLASSES} of: uppercase letters, lowercase letters, digits, special characters. Found: ${characterClasses}`
    );
  }

  if (hasSequentialPattern(password)) {
    throw new Error(
      "Password contains sequential patterns (e.g., '1234', 'abcd'). Use a more random password"
    );
  }
};

export const getPasswordFromProvider = async (provider: PrivateStoragePasswordProvider): Promise<string> => {
  const password = await provider();
  validatePassword(password);
  return password;
};

export const decryptValue = (
  encryptedValue: string,
  encryption: StorageEncryption,
  password: string
): string => {
  if (!StorageEncryption.isEncrypted(encryptedValue)) {
    console.debug('MIDNIGHT: Encountered unencrypted data during decryption - passing through as-is');
    return encryptedValue;
  }

  const version = StorageEncryption.getVersion(encryptedValue);
  if (version === 1) {
    return encryption.decryptWithPassword(encryptedValue, password);
  }
  return encryption.decrypt(encryptedValue);
};
