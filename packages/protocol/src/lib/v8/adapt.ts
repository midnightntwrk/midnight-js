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
import { assertComposeEnvelope } from '../shared/compose-options';
import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from '../shared/compose-types';
import { composeV8CallTx } from './compose';
import { composeV8DeployTx } from './deploy';
import type { ProtocolV8 } from './load';

/**
 * Bridges a raw, serialized contract state into the v8 era, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape.
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
 * cannot decode as {@link ComposeOptionError}. An absent offer is the normal
 * shape of a call that moved no shielded coins, and stays absent.
 *
 * @see {@link ComposeRefusalOrder}
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
 * (`./compose.ts`).
 *
 * This era composes exactly one call: a `calls` tree with more than one entry
 * is refused rather than silently narrowed. A Zswap offer is NOT refused.
 *
 * @param options The era-facade call options.
 * @param v8 The v8 ledger module, as handed over by `loadLedger8`
 *   (`./load.ts`).
 * @returns The UNPROVEN, serialized call transaction.
 * @throws ComposeOptionError If an option cannot be used: a malformed envelope
 *   option, unreadable offer or contract-state bytes, or more than one entry in
 *   `calls`.
 * @throws ComposeFailedError If `calls` is empty (stage `'call-empty'`), and
 *   for every stage the composition leg this delegates to can raise.
 * @see {@link ComposeRefusalOrder}
 * @see {@link EraSeam}
 */
export const composeEraV8CallTx = (options: ComposeCallOptions, v8: ProtocolV8): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  // Checked here, not left to the inner leg, so both arms refuse in the same
  // order; the re-check in the leg is idempotent -- see ComposeRefusalOrder.
  assertComposeEnvelope(options, 'v8');
  if (calls.length === 0) {
    throw new ComposeFailedError('v8', 'call-empty', NO_CIRCUIT);
  }
  // Both offers are read before anything is composed -- see
  // ComposeRefusalOrder.
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
 * (`./deploy.ts`).
 *
 * `verifierKeys` is optional on the facade but required here: this era's deploy
 * leg registers the compiled contract's keys onto the initial state itself, so
 * the omission is reported as {@link ComposeOptionError}.
 *
 * The contract state crosses into the leg by BYTES, which is what that leg
 * takes: it deserializes into its own era rather than accepting a handle.
 *
 * @param options The era-facade deploy options.
 * @param v8 The v8 ledger module, as handed over by `loadLedger8`
 *   (`./load.ts`).
 * @returns The UNPROVEN, serialized deploy transaction, the address it deploys
 *   at, and the registered initial state.
 * @throws ComposeOptionError If an option cannot be used: a malformed envelope
 *   option, unreadable offer bytes, or an omitted `verifierKeys` map.
 * @throws ComposeFailedError For every stage the deploy leg this delegates to
 *   can raise.
 * @see {@link VerifierKeys}
 * @see {@link ComposeRefusalOrder}
 * @see {@link EraSeam}
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
