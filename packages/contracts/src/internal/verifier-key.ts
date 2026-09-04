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
 * The verification-path checks an operation makes against a contract's on-chain verifier keys,
 * before any proof is generated.
 *
 * ## What this module does NOT do, and why
 *
 * It does not classify a contract's key set by KEY GENERATION, and it deliberately holds no
 * generation vocabulary. A ledger contract operation does hold several verifier keys, one per
 * version of the proving system, but neither ledger era exposes that set: `ContractOperation`
 * carries a single `verifierKey` and states in its own documentation that "only the latest
 * available version is exposed to this API", `ContractState` offers no per-version accessor, and
 * the generation vocabulary (`ContractOperationVersion`, `IrInsert`) exists only on the WRITE side,
 * as maintenance-update instructions. **Upstream gap: routing on key generation needs a ledger read
 * API that reports the generation set, which neither era provides today.**
 *
 * The key's own serialization tag is not a substitute: it reads `midnight:verifier-key[v6]` on both
 * eras and under both toolchains, measured across every state fixture, so it carries no generation
 * signal at all. A `[vN]` is an object's wire-schema version and never a ledger era.
 *
 * What is left is the check that carries the security value, and it measures directly what a
 * generation label would only have been a proxy for: a mis-dispatched operation — the wrong
 * pipeline, or the wrong contract address — shows up precisely as a local verifier key that fails
 * to byte-match the on-chain slot, and that is caught here, before proving.
 *
 * ## On a name you will meet in the fixtures
 *
 * The `co-v2` wording in the fixture file name `state-co-v2-only-foreign.hex` is retained: it is
 * checked in and byte-referenced from the fixture manifest. It names nothing in either ledger's
 * API, and nothing in this package's code, so the mismatch between that file name and the
 * vocabulary here is expected rather than a defect.
 *
 * @see packages/protocol/docs/verifier-keys.md
 * @see packages/protocol/docs/fail-closed-decoding.md for why a blank slot is reported as absent
 *      rather than as an empty key.
 */

import { BlankVerifierKeySlotError, VerifierKeyMismatchError } from '../errors';
import { verifierKeysEqual } from '../find-deployed-contract';

/**
 * Refuses an operation whose local verifier key does not match the one the deployed contract holds
 * for that entry point.
 *
 * Called BEFORE proving. A proof generated against a key the chain does not hold is rejected on
 * submission, so checking first turns a paid-for, late failure into a free, immediate one.
 *
 * Synchronous, and it consults no provider: there is no await between this check and the proving
 * step that follows it, so a proof cannot already be in flight when this refuses.
 *
 * @param localKey The verifier key compiled alongside the local artifact.
 * @param onChainSlot The key the fetched contract state registers for this entry point, or
 * `undefined` when the state declares the entry point but no key was ever deployed for it — which
 * is what the era facade reports for a blank slot.
 * @param circuitId The entry point being checked, named in every failure so a dApp calling many
 * circuits can tell which one refused.
 * @throws BlankVerifierKeySlotError if `onChainSlot` is `undefined`.
 * @throws VerifierKeyMismatchError if the two keys do not match byte for byte.
 */
export const assertVerifierKeyMatches = (
  localKey: Uint8Array,
  onChainSlot: Uint8Array | undefined,
  circuitId: string
): void => {
  // Checked before the comparison, and reported as its own condition: a never-deployed slot and a
  // wrong key are different faults with different fixes, and collapsing them would send a caller
  // looking for a build mismatch that is not there.
  if (onChainSlot === undefined) {
    throw new BlankVerifierKeySlotError(circuitId);
  }

  // The comparator already exported from this package, reused rather than reimplemented so there
  // is one definition of what makes two verifier keys equal.
  if (!verifierKeysEqual(localKey, onChainSlot)) {
    throw new VerifierKeyMismatchError(circuitId);
  }
};
