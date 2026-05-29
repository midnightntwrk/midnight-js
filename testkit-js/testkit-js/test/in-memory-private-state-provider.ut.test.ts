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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  InvalidExportFormatError,
  type SigningKeyExport
} from '@midnight-ntwrk/midnight-js-types';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'crypto';

import { inMemoryPrivateStateProvider } from '@/contract/in-memory-private-state-provider';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const ENCRYPTION_VERSION = 1;
const VALID_PASSWORD = 'Valid-Pass9-Test!@';

const CONTRACT_ADDRESS_1 = 'contract-address-1' as ContractAddress;
const CONTRACT_ADDRESS_2 = 'contract-address-2' as ContractAddress;
const VALID_SIGNING_KEY = '0102030a1b2c3d4e5f';

const encryptPayload = (data: string, password: string, salt: Buffer): string => {
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(data, 'utf-8')), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([ENCRYPTION_VERSION]), salt, iv, authTag, encrypted]).toString('base64');
};

const buildExport = (keys: Record<string, unknown>): SigningKeyExport => {
  const salt = randomBytes(SALT_LENGTH);
  const payload = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    keyCount: Object.keys(keys).length,
    keys
  });
  return {
    format: 'midnight-signing-key-export',
    encryptedPayload: encryptPayload(payload, VALID_PASSWORD, salt),
    salt: salt.toString('hex')
  };
};

type PSI = 'state';
type PS = Contract.PrivateState<Contract.Any>;

describe('[Unit tests] inMemoryPrivateStateProvider importSigningKeys validation', () => {
  describe('rejects malformed signingKey values with InvalidExportFormatError', () => {
    it.each([
      ['null',                         { [CONTRACT_ADDRESS_1]: null }],
      ['object',                       { [CONTRACT_ADDRESS_1]: { sk: 'deadbeef' } }],
      ['number',                       { [CONTRACT_ADDRESS_1]: 12345 }],
      ['boolean',                      { [CONTRACT_ADDRESS_1]: true }],
      ['array',                        { [CONTRACT_ADDRESS_1]: ['deadbeef'] }],
      ['empty string',                 { [CONTRACT_ADDRESS_1]: '' }],
      ['non-hex chars',                { [CONTRACT_ADDRESS_1]: 'zz'.repeat(8) }],
      ['odd hex length',               { [CONTRACT_ADDRESS_1]: 'abcde' }],
      ['shorter than version prefix',  { [CONTRACT_ADDRESS_1]: 'ab' }]
    ])('%s value is rejected', async (_reason, keys) => {
      const provider = inMemoryPrivateStateProvider<PSI, PS>();
      const badExport = buildExport(keys as Record<string, unknown>);

      await expect(
        provider.importSigningKeys(badExport, { password: VALID_PASSWORD })
      ).rejects.toThrow(InvalidExportFormatError);
    });
  });

  describe('atomicity', () => {
    it.each([
      ['invalid value last',  { [CONTRACT_ADDRESS_1]: VALID_SIGNING_KEY, [CONTRACT_ADDRESS_2]: null }],
      ['invalid value first', { [CONTRACT_ADDRESS_1]: null,              [CONTRACT_ADDRESS_2]: VALID_SIGNING_KEY }]
    ])('%s leaves all keys unwritten', async (_reason, keys) => {
      const provider = inMemoryPrivateStateProvider<PSI, PS>();
      const badExport = buildExport(keys as Record<string, unknown>);

      await expect(
        provider.importSigningKeys(badExport, { password: VALID_PASSWORD })
      ).rejects.toThrow(InvalidExportFormatError);

      expect(await provider.getSigningKey(CONTRACT_ADDRESS_1)).toBeNull();
      expect(await provider.getSigningKey(CONTRACT_ADDRESS_2)).toBeNull();
    });
  });

  it('accepts a well-formed hex signing key', async () => {
    const provider = inMemoryPrivateStateProvider<PSI, PS>();
    const goodExport = buildExport({ [CONTRACT_ADDRESS_1]: VALID_SIGNING_KEY });

    const result = await provider.importSigningKeys(goodExport, { password: VALID_PASSWORD });

    expect(result.imported).toBe(1);
    expect(await provider.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(VALID_SIGNING_KEY);
  });
});
