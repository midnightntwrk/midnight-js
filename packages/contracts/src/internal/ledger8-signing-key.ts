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

/**
 * How a RETAINED-era signing key is carried in the private-state provider,
 * which is the only signing-key storage this framework has and is typed for the
 * CURRENT era's key.
 *
 * The two eras' keys looked like different things and are not. Measured on both
 * runtimes:
 *
 * - the retained `sampleSigningKey()` answers a bare 64-character hex string,
 *   which is 32 bytes;
 * - the current `sampleSigningKey()` answers `{ tag: 'schnorr', value }` whose
 *   `value` is the same 64 characters;
 * - the retained runtime's `signatureVerifyingKey()` ACCEPTS a current-era
 *   key's `value` verbatim;
 * - `{ tag: 'schnorr', value: <retained key> }` satisfies `isValidSigningKey`,
 *   which is what the level-backed provider validates imports against.
 *
 * So it is one 32-byte Schnorr key in two wrappers, and adding or stripping the
 * wrapper here is the whole of the era crossing. Nothing in `packages/types`,
 * in the provider interface, or in the export/import format changes for it.
 *
 * The retained runtime's own typings describe a `SigningKey` as hex "with a
 * 3-byte version prefix". The sampled key carries no such prefix — 64
 * characters is exactly the 32 bytes and nothing more — so the measurement is
 * what this module is built on, not that sentence.
 */

import type { Ledger8SigningKey } from '@midnight-ntwrk/midnight-js-protocol';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

/**
 * The signature kind a retained-era key is, and the only kind that may be read
 * back out as one.
 */
const RETAINED_SIGNING_KEY_TAG: SigningKey['tag'] = 'schnorr';

/**
 * Wraps a retained-era key in the shape `PrivateStateProvider.setSigningKey`
 * takes.
 *
 * @param signingKey The retained-era key to store.
 * @returns The same key, as the store's structured key.
 */
export const toStoredLedger8SigningKey = (signingKey: Ledger8SigningKey): SigningKey => ({
  tag: RETAINED_SIGNING_KEY_TAG,
  value: signingKey
});

/**
 * Reads a stored key back as the bare string the retained runtime takes,
 * refusing an entry of the other signature kind.
 *
 * The refusal is the point of the function. One store holds both eras' keys
 * under the same addresses, and the current era's may legitimately be `ecdsa` —
 * `isValidSigningKey` admits both kinds. Unwrapped without the check, an
 * `ecdsa` key's `value` would be handed to the retained runtime and built into
 * a maintenance authority whose verifying key nobody holds, with nothing
 * erroring at any stage.
 *
 * @param stored The entry the private-state provider returned.
 * @param contractAddress The address it was stored against, named in the
 * refusal so a caller knows which entry to correct.
 * @returns The retained-era key.
 * @throws Error if the entry is not of the retained era's signature kind.
 */
export const fromStoredLedger8SigningKey = (stored: SigningKey, contractAddress: string): Ledger8SigningKey => {
  if (stored.tag !== RETAINED_SIGNING_KEY_TAG) {
    throw new Error(
      `The signing key stored for the contract at '${contractAddress}' is a '${stored.tag}' key, and a ` +
        `retained-era maintenance authority is built from a '${RETAINED_SIGNING_KEY_TAG}' key. One store holds ` +
        'both eras\' keys, so an entry written for a current-era contract at this address reads back here. ' +
        "Supply the retained-era key on this call's 'signingKey', or remove the entry with " +
        "'privateStateProvider.removeSigningKey(address)' first. The stored key is not rendered: it is secret " +
        'material, and an error message reaches logs.'
    );
  }
  return stored.value;
};
