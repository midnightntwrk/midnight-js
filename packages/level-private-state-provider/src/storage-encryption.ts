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

import { validatePassword } from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { type CryptoBackend, type CryptoBackendType, resolveCryptoBackend } from './crypto-backend';

export type PrivateStoragePasswordProvider = () => string | Promise<string>;

export interface StorageEncryptionOptions {
  existingSalt?: Buffer | Uint8Array;
  cryptoBackend?: CryptoBackendType;
}

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

const deriveEncryptionKey = async (
  backend: CryptoBackend,
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> => {
  const passwordBytes = new TextEncoder().encode(password);
  return backend.pbkdf2(passwordBytes, salt, iterations, KEY_LENGTH);
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
  private readonly backend: CryptoBackend;

  private constructor(encryptionKey: Uint8Array, salt: Uint8Array, backend: CryptoBackend) {
    this.encryptionKey = encryptionKey;
    this.salt = salt;
    this.backend = backend;
  }

  static async create(password: string, options?: StorageEncryptionOptions): Promise<StorageEncryption> {
    const backend = resolveCryptoBackend(options?.cryptoBackend);
    const salt = options?.existingSalt ? new Uint8Array(options.existingSalt) : backend.randomBytes(SALT_LENGTH);
    const encryptionKey = await deriveEncryptionKey(backend, password, salt, PBKDF2_ITERATIONS_V2);
    return new StorageEncryption(encryptionKey, salt, backend);
  }

  async verifyPassword(password: string): Promise<boolean> {
    const candidateKey = await deriveEncryptionKey(this.backend, password, this.salt, PBKDF2_ITERATIONS_V2);
    return timingSafeEqual(candidateKey, this.encryptionKey);
  }

  async encrypt(data: string): Promise<string> {
    const plaintext = new TextEncoder().encode(data);
    const iv = this.backend.randomBytes(IV_LENGTH);
    const { ciphertext, authTag } = await this.backend.aesGcmEncrypt(this.encryptionKey, iv, plaintext);

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

    const decrypted = await this.backend.aesGcmDecrypt(this.encryptionKey, iv, encrypted, authTag);
    return Buffer.from(decrypted).toString('utf-8');
  }

  async decryptWithPassword(encryptedData: string, password: string): Promise<string> {
    const data = Buffer.from(encryptedData, 'base64');
    const { version, salt, iv, authTag, encrypted } = extractEncryptedComponents(data);

    if (!timingSafeEqual(Buffer.from(this.salt), salt)) {
      throw new Error('Salt mismatch: data was encrypted with a different password');
    }

    const iterations = getIterationsForVersion(version);
    const decryptionKey = version === CURRENT_ENCRYPTION_VERSION
      ? this.encryptionKey
      : await deriveEncryptionKey(this.backend, password, salt, iterations);

    const decrypted = await this.backend.aesGcmDecrypt(decryptionKey, iv, encrypted, authTag);
    return Buffer.from(decrypted).toString('utf-8');
  }

  static isEncrypted(data: string): boolean {
    const buffer = Buffer.from(data, 'base64');
    const version = buffer[0];
    return buffer.length >= HEADER_LENGTH &&
      (version === ENCRYPTION_VERSION_V1 || version === ENCRYPTION_VERSION_V2);
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
    throw new Error(
      'Unrecognized or unencrypted data encountered during decryption'
    );
  }

  const version = StorageEncryption.getVersion(encryptedValue);
  if (version === 1) {
    return encryption.decryptWithPassword(encryptedValue, password);
  }
  return encryption.decrypt(encryptedValue);
};
