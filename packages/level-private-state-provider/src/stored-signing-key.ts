/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { PROVIDER_ERROR_CATEGORIES, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-types';
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';

const LEGACY_SIGNING_KEY = /^[0-9a-fA-F]{64}$/;

/**
 * Thrown when a signing key read from the store is neither a structured
 * `SigningKey` nor a key written by a 4.x client.
 */
export class StoredSigningKeyFormatError extends MidnightJsError {
  readonly code = PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID;
  readonly category = PROVIDER_ERROR_CATEGORIES[PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID];
  readonly contractAddress: ContractAddress;

  constructor(contractAddress: ContractAddress) {
    super(
      `The signing key stored for contract '${contractAddress}' is not a valid signing key. ` +
        'Store a valid key with setSigningKey(address, { tag, value }), or delete the entry with removeSigningKey(address).'
    );
    this.name = 'StoredSigningKeyFormatError';
    this.contractAddress = contractAddress;
  }
}

/**
 * Reads a decrypted signing-key entry as a `SigningKey`. A 4.x client stored a
 * bare 64-character hex Schnorr key; it is returned as `{ tag: 'schnorr', value }`.
 *
 * @throws StoredSigningKeyFormatError If the entry is neither shape.
 */
export const readStoredSigningKey = (stored: unknown, contractAddress: ContractAddress): SigningKey => {
  if (isValidSigningKey(stored)) {
    return stored;
  }
  if (typeof stored === 'string' && LEGACY_SIGNING_KEY.test(stored)) {
    return { tag: 'schnorr', value: stored };
  }
  throw new StoredSigningKeyFormatError(contractAddress);
};
