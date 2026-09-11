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

import type { ProvingProvider } from '@midnightntwrk/ledger-v9';

import { PayloadNotATransactionError, TRANSACTION_TAG_PREFIX } from '../../errors';
import { loadLedger8 } from './load';

const TRANSACTION_TAG_PREFIX_BYTES = Uint8Array.from(TRANSACTION_TAG_PREFIX, (character) =>
  character.charCodeAt(0)
);

// Establishes that the bytes are a serialized TRANSACTION, and deliberately not
// which era wrote them: both eras' tags open identically. The era is carried by
// the `version` discriminant of the payload the seam received, and the runtime
// re-validates the full tag when it deserializes.
//
// Compared byte-wise rather than by decoding a prefix to text: the input is
// attacker-controlled at this seam.
const assertSerializedTransaction = (txBytes: Uint8Array): void => {
  // Checked despite the declared type: this is the seam an untyped caller
  // reaches, and reading `.byteLength` off whatever actually arrived would
  // raise a bare `TypeError` carrying no code.
  if (!(txBytes instanceof Uint8Array)) {
    throw PayloadNotATransactionError.notBytes(txBytes);
  }
  const matchesPrefix =
    txBytes.byteLength >= TRANSACTION_TAG_PREFIX_BYTES.length &&
    TRANSACTION_TAG_PREFIX_BYTES.every((byte, index) => txBytes[index] === byte);
  if (!matchesPrefix) {
    throw PayloadNotATransactionError.wrongTag(txBytes.byteLength);
  }
};

/**
 * Proves a retained-era transaction, taking serialized bytes and returning
 * serialized bytes.
 *
 * Bytes on both sides is the seam's contract, not an implementation detail: a
 * retained-era transaction cannot cross a provider boundary as a live object,
 * because the runtime that owns it is loaded lazily and its instances are not
 * interchangeable with the current era's.
 *
 * The cost model comes from the same `loadLedger8` result as the transaction
 * class, and that pairing is load-bearing: the retained ledger ships its own
 * `CostModel` and its `prove()` checks the argument against that class across
 * the WASM boundary, so the current era's cost model is rejected with
 * `expected instance of CostModel`.
 *
 * @param txBytes The serialized, unproven retained-era transaction.
 * @param provingProvider The circuit-level proving provider to drive. The
 *   current era's `ProvingProvider` shape satisfies the retained runtime's
 *   structurally — it declares the same `check` and `prove` and one member
 *   more — so the two need no adapter between them.
 * @returns The serialized, proven transaction.
 * @throws PayloadNotATransactionError If `txBytes` is not a serialized
 *   transaction.
 * @throws Ledger8RuntimeMissingError If the retained runtime cannot be loaded.
 *
 * @remarks Intended for `ProofProvider` implementations. Application code
 * should call `proveTx` on a provider rather than this directly: the provider
 * is what pairs it with a configured proving provider and answers in the
 * version-tagged shape the rest of the flow expects.
 *
 * @see docs/adr/0006-version-tagged-payloads-at-provider-seams.md
 * @see docs/adr/0010-publish-era-handles-alongside-their-plain-data.md
 */
export const proveV8Transaction = async (
  txBytes: Uint8Array,
  provingProvider: ProvingProvider
): Promise<Uint8Array> => {
  assertSerializedTransaction(txBytes);
  const v8 = await loadLedger8();
  const unproven = v8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', txBytes);
  const proven = await unproven.prove(provingProvider, v8.CostModel.initialCostModel());
  return proven.serialize();
};
