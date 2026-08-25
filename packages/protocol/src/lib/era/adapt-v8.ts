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

import { ComposeFailedError, ComposeOptionError } from '../../errors';
import { composeV8CallTx } from '../engine/compose-v8';
import { composeV8DeployTx } from '../engine/deploy-v8';
import type { ProtocolV8 } from '../load-v8';
import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from './compose-types';

/**
 * What `circuitId` a failure names when it happened before any circuit was
 * looked up. Kept as one literal so it can never be mistaken for a real entry
 * point a caller might try to resolve.
 */
const NO_CIRCUIT = '(none)';

/**
 * Bridges a raw, serialized contract state into the v8 era, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape — the same wrapping the v9 arm applies to the
 * identical call.
 */
const readContractState = (raw: Uint8Array, v8: ProtocolV8): InstanceType<ProtocolV8['ContractState']> => {
  try {
    return v8.ContractState.deserialize(raw);
  } catch (cause) {
    throw new ComposeOptionError('v8', 'contractState', cause);
  }
};

/**
 * Refuses a Zswap offer on the retained era.
 *
 * This era's execution leg builds its circuit context from a coin public key
 * alone and does not carry the post-call Zswap local state, so a coin-moving
 * call cannot be composed here at all. Accepting an offer and composing around
 * it would produce an unbalanced transaction that the node rejects on
 * submission, with nothing having reported a problem. The two eras are
 * therefore NOT interchangeable for coin-moving circuits, and this is the seam
 * where that shows.
 *
 * Raised as {@link ComposeOptionError} naming the offending option, not as
 * `Ledger8ZswapUnsupportedError`: no circuit ran here and none produced
 * anything, so the class whose message says a circuit produced Zswap effects
 * would be describing something that did not happen. That class stays on the
 * execution leg, where a circuit really did. Keeping them apart is what lets a
 * caller tell "my circuit moves coins, it cannot run on v8" from "I passed
 * offer bytes to a v8 composition".
 */
const refuseZswapOffer = (offers: readonly (Uint8Array | undefined)[]): void => {
  if (offers.some((offer) => offer !== undefined)) {
    throw new ComposeOptionError('v8', 'zswapOffer');
  }
};

/**
 * Maps the era-facade's call options onto the v8-native composition leg
 * (`../engine/compose-v8.ts`).
 *
 * Two shapes the facade allows are not expressible on this era, and both are
 * refused rather than silently narrowed:
 * - a call tree with more than one entry. This era's execution leg runs a
 *   single circuit and refuses one with coin effects, so it has no
 *   cross-contract call tree; composing only the first entry would drop the
 *   rest without a word.
 * - a Zswap offer — see {@link refuseZswapOffer}.
 */
export const composeEraV8CallTx = (options: ComposeCallOptions, v8: ProtocolV8): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  if (calls.length === 0) {
    throw new ComposeFailedError('v8', 'call-empty', NO_CIRCUIT);
  }
  const [call] = calls;
  refuseZswapOffer([guaranteedZswapOffer, fallibleZswapOffer]);
  if (calls.length > 1) {
    throw new ComposeOptionError('v8', 'calls');
  }

  return composeV8CallTx(
    {
      circuitId: call.circuitId,
      contractAddress: call.contractAddress,
      contractState: readContractState(call.contractState, v8),
      transcript: call.transcript,
      privateTranscriptOutputs: call.privateTranscriptOutputs,
      input: call.input,
      output: call.output,
      communicationCommitmentRandomness: call.communicationCommitmentRandomness,
      networkId,
      ttl
    },
    v8
  );
};

/**
 * Maps the era-facade's deploy options onto the v8-native deploy leg
 * (`../engine/deploy-v8.ts`).
 *
 * `verifierKeys` is optional on the facade but required here: this era's deploy
 * leg registers the compiled contract's keys onto the initial state itself, and
 * a constructor-built state declares every entry point with a blank key. A
 * deploy composed without the map would carry unregistered entry points and be
 * refused by the ledger's own well-formedness check, so the omission is
 * reported as {@link ComposeOptionError} here instead.
 *
 * The contract state crosses into the leg by BYTES, which is what that leg
 * already expects — it bridges by serialization rather than by handle, so no
 * object is passed between two WASM copies.
 */
export const composeEraV8DeployTx = (options: ComposeDeployOptions, v8: ProtocolV8): DeployResultPojo => {
  const { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  refuseZswapOffer([guaranteedZswapOffer]);
  if (verifierKeys === undefined) {
    throw new ComposeOptionError('v8', 'verifierKeys');
  }

  return composeV8DeployTx(
    { contractState: { serialize: () => contractState }, verifierKeys, networkId, ttl },
    v8
  );
};
