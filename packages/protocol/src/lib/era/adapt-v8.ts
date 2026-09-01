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

import { ComposeFailedError, ComposeOptionError, NO_CIRCUIT } from '../../errors';
import type { UnprovenOffer } from '../../v8.js';
import { assertComposeEnvelope } from '../engine/compose-options';
import { composeV8CallTx } from '../engine/compose-v8';
import { composeV8DeployTx } from '../engine/deploy-v8';
import type { ProtocolV8 } from '../load-v8';
import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from './compose-types';

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
 * Reads a serialized Zswap offer into the v8 era, reporting bytes this era
 * cannot decode as {@link ComposeOptionError} — the same wrapping the v9 arm
 * applies to the identical call (`./compose-v9.ts`). An absent offer is the
 * normal shape of a call that moved no shielded coins, and stays absent.
 *
 * Both eras carry an offer. The retained era executes coin-moving circuits and
 * hands their post-call Zswap local state back on the transcript
 * (`../engine/execute.ts`), which is what a caller turns into the offer it
 * passes here (`zswapStateToSegmentedOffer`,
 * `packages/contracts/src/utils/zswap-utils.ts`). Refusing the offer on this
 * era would take away the only way to attach those coin movements to the
 * transaction that carries the call.
 */
const readZswapOffer = (raw: Uint8Array | undefined, v8: ProtocolV8): UnprovenOffer | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return v8.ZswapOffer.deserialize('pre-proof', raw);
  } catch (cause) {
    throw new ComposeOptionError('v8', 'zswapOffer', cause);
  }
};

/**
 * Maps the era-facade's call options onto the v8-native composition leg
 * (`../engine/compose-v8.ts`).
 *
 * One shape the facade allows is not expressible on this era and is refused
 * rather than silently narrowed: a call tree with more than one entry. A
 * cross-contract call is a ledger-9-only feature that a pre-fork contract
 * cannot emit at all, so this era has no call tree to compose, and composing
 * only the first entry would drop the rest without a word.
 *
 * A Zswap offer is NOT refused — see {@link readZswapOffer}.
 */
export const composeEraV8CallTx = (options: ComposeCallOptions, v8: ProtocolV8): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  // Checked here rather than left to the inner leg, so this arm refuses the
  // options in the SAME order the v9 arm does: envelope, then the call list,
  // then the offers, then the era's own limits, then the state. A caller
  // handing both an empty network id and unreadable offer bytes has one defect
  // to fix per era, not a different one per era. The inner leg checks the
  // envelope again; the check is idempotent, and leaving it there keeps
  // `composeV8CallTx` safe to call directly.
  assertComposeEnvelope(options, 'v8');
  if (calls.length === 0) {
    throw new ComposeFailedError('v8', 'call-empty', NO_CIRCUIT);
  }
  // Both offers are read before anything is composed, so a caller handed bad
  // offer bytes learns that instead of paying for a full assembly first.
  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer, v8);
  const fallibleOffer = readZswapOffer(fallibleZswapOffer, v8);
  if (calls.length > 1) {
    throw new ComposeOptionError('v8', 'calls');
  }
  const [call] = calls;

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
      ttl,
      guaranteedZswapOffer: guaranteedOffer,
      fallibleZswapOffer: fallibleOffer
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
 * takes: it deserializes into its own era rather than accepting a handle, so
 * no object is passed between two WASM copies.
 *
 * One ordering difference from the v9 arm survives on purpose. Both check the
 * envelope first and the offer second, but v9 reads the state before it looks
 * at `verifierKeys`, while this arm cannot: the state is read by the leg it
 * delegates to, and reading it here as well would deserialize the same bytes
 * twice. So a deploy that is BOTH unreadable and missing its key map reports
 * `'contractState'` on v9 and `'verifierKeys'` here. Both name a real defect in
 * the same call, and closing the gap costs a redundant deserialization of every
 * deploy to reorder a diagnosis for a caller who has two things to fix either
 * way.
 */
export const composeEraV8DeployTx = (options: ComposeDeployOptions, v8: ProtocolV8): DeployResultPojo => {
  const { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  // See `composeEraV8CallTx` — hoisted so both arms refuse the envelope first.
  assertComposeEnvelope(options, 'v8');
  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer, v8);
  if (verifierKeys === undefined) {
    throw new ComposeOptionError('v8', 'verifierKeys');
  }

  return composeV8DeployTx(
    { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer: guaranteedOffer },
    v8
  );
};
