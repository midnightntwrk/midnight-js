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
import sodium from 'libsodium-wrappers';

let sodiumReady = false;

export const ensureSodiumReady = async (): Promise<void> => {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
};

export const zeroizeBuffer = (buffer: Buffer | Uint8Array): void => {
  if (!sodiumReady) {
    throw new Error('Sodium not initialized. Call initializeSodium() first.');
  }

  if (buffer.length === 0) {
    return;
  }

  try {
    sodium.memzero(buffer);
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }
};

export const zeroizeString = (str: string): void => {
  if (str.length === 0) {
    return;
  }

  const buffer = Buffer.from(str, 'utf-8');
  zeroizeBuffer(buffer);
};

export const withZeroization = async <T>(
  buffer: Buffer | Uint8Array,
  fn: (buffer: Buffer | Uint8Array) => Promise<T>
): Promise<T> => {
  try {
    return await fn(buffer);
  } finally {
    zeroizeBuffer(buffer);
  }
};
