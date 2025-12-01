/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const ENCRYPTION_VERSION = 1;

const VERSION_PREFIX_LENGTH = 1;
const HEADER_LENGTH = VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

export interface EncryptionMetadata {
  salt: Buffer;
  version: number;
}

export class StorageEncryption {
  private readonly encryptionKey: Buffer;
  private readonly salt: Buffer;

  constructor(password: string, existingSalt?: Buffer) {
    this.salt = existingSalt ?? randomBytes(SALT_LENGTH);
    this.encryptionKey = this.deriveKey(password, this.salt);
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  encrypt(data: string): string {
    const plaintext = Buffer.from(data, 'utf-8');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const version = Buffer.from([ENCRYPTION_VERSION]);
    const result = Buffer.concat([version, this.salt, iv, authTag, encrypted]);

    return result.toString('base64');
  }

  decrypt(encryptedData: string): string {
    const data = Buffer.from(encryptedData, 'base64');

    if (data.length < HEADER_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const version = data[0];
    if (version !== ENCRYPTION_VERSION) {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    const salt = data.subarray(VERSION_PREFIX_LENGTH, VERSION_PREFIX_LENGTH + SALT_LENGTH);
    const iv = data.subarray(VERSION_PREFIX_LENGTH + SALT_LENGTH, VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH,
      VERSION_PREFIX_LENGTH + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = data.subarray(HEADER_LENGTH);

    if (!this.salt.equals(salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  static isEncrypted(data: string): boolean {
    try {
      const buffer = Buffer.from(data, 'base64');
      return buffer.length >= HEADER_LENGTH && buffer[0] === ENCRYPTION_VERSION;
    } catch {
      return false;
    }
  }

  getSalt(): Buffer {
    return this.salt;
  }
}

export const getStoragePassword = (): string => {
  const password = process.env.MIDNIGHT_STORAGE_PASSWORD;

  if (!password) {
    throw new Error(
      'MIDNIGHT_STORAGE_PASSWORD environment variable is required.\n' +
      'Please set it to a strong, unique password:\n' +
      '  export MIDNIGHT_STORAGE_PASSWORD="your-secure-password-here"\n\n' +
      'For production environments, use a cryptographically secure password:\n' +
      '  export MIDNIGHT_STORAGE_PASSWORD="$(openssl rand -base64 32)"'
    );
  }

  if (password.length < 16) {
    throw new Error(
      'MIDNIGHT_STORAGE_PASSWORD must be at least 16 characters long.\n' +
      'Use a strong, randomly generated password for production.'
    );
  }

  return password;
};
