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

import type { BinaryLike } from 'crypto';
import crypto from 'crypto';

import { httpClientProofProvider, serializePayload, serializeZKConfig } from '../http-client-proof-provider';
import { getValidUnprovenTx, getValidZKConfig } from './commons';

const createHash = (binaryLike: BinaryLike): string => {
  return crypto.createHash('sha256').update(binaryLike).digest().toString('base64');
};

describe('Http Proof Server Proof Provider', () => {
  test("'httpProofServerProofProvider' throws when 'url' does not start with 'http:' or 'https:'", () => {
    expect(() => httpClientProofProvider('ws://localhost:8080')).toThrow(/Invalid protocol scheme: 'ws:'/);
  });

  test("'serializeData' encodes empty key/zkir sets correctly", async () => {
    expect(createHash(serializeZKConfig())).toEqual(createHash(Buffer.alloc(4, 0)));
  });

  test("'serializePayload' produces deterministic output", async () => {
    const zkConfig = await getValidZKConfig();
    const unprovenTx = await getValidUnprovenTx();
    const payload1 = await serializePayload(unprovenTx, zkConfig);
    const payload2 = await serializePayload(unprovenTx, zkConfig);
    expect(createHash(Buffer.from(payload1))).toEqual(createHash(Buffer.from(payload2)));
    expect(payload1.byteLength).toBeGreaterThan(0);
  });

  test('handles Uint8Array<ArrayBufferLike> correctly', async () => {
    const zkConfig = await getValidZKConfig();
    const unprovenTx = await getValidUnprovenTx();

    const result = await serializePayload(unprovenTx, zkConfig);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  test('handles undefined zkConfig correctly', async () => {
    const unprovenTx = await getValidUnprovenTx();

    const result = await serializePayload(unprovenTx, undefined);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });
});
