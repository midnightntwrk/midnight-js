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

export type PrivateStoragePasswordProvider = () => string | Promise<string>;

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

export const assertWebCryptoAvailable = (): void => {
  if (typeof globalThis.crypto === 'undefined') {
    throw new Error(
      'Web Crypto API is not available. Ensure you are running in Node.js >= 15 or a browser with Web Crypto support.'
    );
  }
  if (typeof globalThis.crypto.subtle === 'undefined') {
    throw new Error(
      'Web Crypto subtle API is not available. In browsers, this requires a secure context (HTTPS or localhost).'
    );
  }
};

const getRandomBytes = (length: number): Uint8Array => {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
};

const sha256 = async (data: Uint8Array): Promise<Uint8Array> => {
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
};

const pbkdf2 = async (
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keyLength: number
): Promise<Uint8Array> => {
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    password,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    keyLength * 8
  );
  return new Uint8Array(derived);
};

const aesGcmEncrypt = async (
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> => {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw', key, 'AES-GCM', false, ['encrypt']
  );
  const result = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    cryptoKey,
    plaintext
  );
  const resultBytes = new Uint8Array(result);
  const ciphertext = resultBytes.slice(0, resultBytes.length - AUTH_TAG_LENGTH);
  const authTag = resultBytes.slice(resultBytes.length - AUTH_TAG_LENGTH);
  return { ciphertext, authTag };
};

const aesGcmDecrypt = async (
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  authTag: Uint8Array
): Promise<Uint8Array> => {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw', key, 'AES-GCM', false, ['decrypt']
  );
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);
  const result = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
    cryptoKey,
    combined
  );
  return new Uint8Array(result);
};

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

const hashPassword = async (password: string): Promise<string> => {
  const data = new TextEncoder().encode(password);
  const hash = await sha256(data);
  return Buffer.from(hash).toString('hex');
};

const constantTimeBufferEqual = (aBuf: Buffer, bBuf: Buffer): boolean => {
  if (aBuf.length !== bBuf.length) {
    throw new RangeError('Input buffers must have the same byte length');
  }
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
};

/**
 * Compares two Buffers or Uint8Arrays in constant time.
 *
 * @param a - First buffer to compare.
 * @param b - Second buffer to compare.
 * @returns `true` if the buffers are equal, `false` otherwise.
 *
 * @remarks
 * If the inputs differ in length, an error is thrown (not constant-time for length mismatch).
 * This matches the Node.js native timingSafeEqual behavior (which throws on length mismatch).
 *
 * For fixed-length buffers (e.g., hashes), this is safe. For variable-length buffers, callers should be
 * aware of potential timing leakage.
 */
export const timingSafeEqual = (a: Buffer | Uint8Array, b: Buffer | Uint8Array): boolean => {
  const aBuf = Buffer.isBuffer(a) ? a : Buffer.from(a);
  const bBuf = Buffer.isBuffer(b) ? b : Buffer.from(b);
  return constantTimeBufferEqual(aBuf, bBuf);
};


export class StorageEncryption {
  private readonly encryptionKey: Uint8Array;
  private readonly salt: Uint8Array;
  private readonly passwordHash: string;

  private constructor(encryptionKey: Uint8Array, salt: Uint8Array, passwordHash: string) {
    this.encryptionKey = encryptionKey;
    this.salt = salt;
    this.passwordHash = passwordHash;
  }

  static async create(password: string, existingSalt?: Buffer | Uint8Array): Promise<StorageEncryption> {
    assertWebCryptoAvailable();
    const salt = existingSalt ? new Uint8Array(existingSalt) : getRandomBytes(SALT_LENGTH);
    const passwordBytes = new TextEncoder().encode(password);
    const encryptionKey = await pbkdf2(passwordBytes, salt, PBKDF2_ITERATIONS_V2, KEY_LENGTH);
    const passwordHash = await hashPassword(password);
    return new StorageEncryption(encryptionKey, salt, passwordHash);
  }

  async verifyPassword(password: string): Promise<boolean> {
    const inputHash = Buffer.from(await hashPassword(password), 'hex');
    const storedHash = Buffer.from(this.passwordHash, 'hex');
    return timingSafeEqual(inputHash, storedHash);
  }

  async encrypt(data: string): Promise<string> {
    const plaintext = new TextEncoder().encode(data);
    const iv = getRandomBytes(IV_LENGTH);
    const { ciphertext, authTag } = await aesGcmEncrypt(this.encryptionKey, iv, plaintext);

    const version = new Uint8Array([CURRENT_ENCRYPTION_VERSION]);
    const result = Buffer.concat([version, this.salt, iv, authTag, ciphertext]);

    return result.toString('base64');
  }

  async decrypt(encryptedData: string): Promise<string> {
    const data = Buffer.from(encryptedData, 'base64');
    const { version, salt, iv, authTag, encrypted } = extractEncryptedComponents(data);

    if (version === ENCRYPTION_VERSION_V1) {
      throw new Error('V1 encrypted data requires password for decryption. Use decryptWithPassword() instead.');
    }

    if (!timingSafeEqual(Buffer.from(this.salt), salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const decrypted = await aesGcmDecrypt(this.encryptionKey, iv, encrypted, authTag);
    return Buffer.from(decrypted).toString('utf-8');
  }

  async decryptWithPassword(encryptedData: string, password: string): Promise<string> {
    const data = Buffer.from(encryptedData, 'base64');
    const { version, salt, iv, authTag, encrypted } = extractEncryptedComponents(data);

    if (!timingSafeEqual(Buffer.from(this.salt), salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const iterations = getIterationsForVersion(version);
    let decryptionKey: Uint8Array;
    if (version === CURRENT_ENCRYPTION_VERSION) {
      decryptionKey = this.encryptionKey;
    } else {
      const passwordBytes = new TextEncoder().encode(password);
      decryptionKey = await pbkdf2(passwordBytes, salt, iterations, KEY_LENGTH);
    }

    const decrypted = await aesGcmDecrypt(decryptionKey, iv, encrypted, authTag);
    return Buffer.from(decrypted).toString('utf-8');
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
    return Buffer.from(this.salt);
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

export const decryptValue = async (
  encryptedValue: string,
  encryption: StorageEncryption,
  password: string
): Promise<string> => {
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
