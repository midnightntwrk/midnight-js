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

import * as ledgerV9 from '@midnightntwrk/ledger-v9';

import { ComposeFailedError, ComposeOptionError } from '../../errors';
import { assembleCallPrototype } from '../engine/assemble-call';
import { assertComposeEnvelope } from '../engine/compose-options';
import type { ComposeCallOptions } from './compose-types';
import { aggregateUnshieldedOffers } from './unshielded';

/**
 * What `circuitId` a failure names when it happened before any circuit was
 * looked up. `'call-empty'` is the only stage that reaches this, and its
 * message names no circuit — this value exists so the field is never an
 * invented circuit name a caller might try to resolve.
 */
const NO_CIRCUIT = '(none)';

/**
 * Bridges a raw, serialized contract state into the v9 era, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape.
 */
const readContractState = (raw: Uint8Array): ledgerV9.ContractState => {
  try {
    return ledgerV9.ContractState.deserialize(raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', 'contractState', cause);
  }
};

/**
 * Reads a serialized Zswap offer, reporting bytes this era cannot decode as
 * {@link ComposeOptionError}. An absent offer is the normal shape of a call
 * that moved no shielded coins, and stays absent.
 */
const readZswapOffer = (raw: Uint8Array | undefined): ledgerV9.UnprovenOffer | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return ledgerV9.ZswapOffer.deserialize('pre-proof', raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', 'zswapOffer', cause);
  }
};

/**
 * Composes a v9-native call transaction from one or more contract calls and
 * immediately serializes it.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called. Proving needs a proving provider and a
 * running proof server, neither of which this seam has.
 *
 * Uses `Transaction.fromPartsRandomized`, so the intent lands at a random
 * segment id and stays mergeable with other calls. Only deploys use a fixed
 * segment.
 *
 * Every option is checked before anything is composed, and every failure is
 * coded: an empty call list is refused with {@link ComposeFailedError} at stage
 * `'call-empty'`, and an unreadable contract state, Zswap offer, network id or
 * ttl with {@link ComposeOptionError}. A missing or unkeyed operation surfaces
 * from the shared assembler as stage `'call-operation'` or
 * `'call-verifier-key'`.
 *
 * The transaction's two unshielded offers aggregate the user-addressed outputs
 * of EVERY call in the tree, not just the root — see
 * {@link aggregateUnshieldedOffers}.
 */
export const composeV9CallTx = (options: ComposeCallOptions): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  assertComposeEnvelope(options, 'v9');
  if (calls.length === 0) {
    throw new ComposeFailedError('v9', 'call-empty', NO_CIRCUIT);
  }

  // Read both offers before composing anything, so a caller handed bad offer
  // bytes learns that instead of paying for a full assembly first.
  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer);
  const fallibleOffer = readZswapOffer(fallibleZswapOffer);

  let intent = ledgerV9.Intent.new(ttl);
  for (const call of calls) {
    intent = intent.addCall(
      assembleCallPrototype(ledgerV9, {
        circuitId: call.circuitId,
        contractAddress: call.contractAddress,
        transcript: call.transcript,
        privateTranscriptOutputs: call.privateTranscriptOutputs,
        input: call.input,
        output: call.output,
        communicationCommitmentRandomness: call.communicationCommitmentRandomness,
        operations: readContractState(call.contractState),
        stage: 'call-operation',
        version: 'v9'
      })
    );
  }

  // Read the partitioned pairs back off the intent rather than re-deriving
  // them: these are the exact transcripts the transaction now carries, so the
  // offers cannot describe a different partition than the calls do.
  const unshielded = aggregateUnshieldedOffers(
    intent.actions
      .filter((action) => action instanceof ledgerV9.ContractCall)
      .map((call) => ({ guaranteed: call.guaranteedTranscript, fallible: call.fallibleTranscript })),
    ledgerV9
  );
  if (unshielded.guaranteed !== undefined) {
    intent.guaranteedUnshieldedOffer = unshielded.guaranteed;
  }
  if (unshielded.fallible !== undefined) {
    intent.fallibleUnshieldedOffer = unshielded.fallible;
  }

  return ledgerV9.Transaction.fromPartsRandomized(networkId, guaranteedOffer, fallibleOffer, intent).serialize();
};
