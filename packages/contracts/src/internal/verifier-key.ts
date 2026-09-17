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
 * Deliberately holds NO key-generation vocabulary: neither ledger era exposes a contract
 * operation's per-generation key set, so routing on generation is not merely unimplemented but
 * unavailable. What is checked instead measures directly what a generation label would only have
 * been a proxy for.
 *
 * @see {@link VerificationPath} for the upstream gap, why the serialization tag is not a
 *      substitute, and the fixture name that does not match this vocabulary.
 */

import { BlankVerifierKeySlotError, VerifierKeyMismatchError } from '../errors';
import { verifierKeysEqual } from '../find-deployed-contract';

/**
 * Refuses an operation whose local verifier key does not match the one the deployed contract holds
 * for that entry point.
 *
 * Called BEFORE proving. Synchronous, and it consults no provider: keep it that way, because there
 * must be no await between this check and the proving step that follows it.
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
  // Its own condition, not folded into the mismatch below: a never-deployed slot and a wrong key
  // are different faults with different fixes.
  if (onChainSlot === undefined) {
    throw new BlankVerifierKeySlotError(circuitId);
  }

  // Reused rather than reimplemented, so there is one definition of verifier-key equality.
  if (!verifierKeysEqual(localKey, onChainSlot)) {
    throw new VerifierKeyMismatchError(circuitId);
  }
};
