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

import type { AlignedValue } from '@midnightntwrk/ledger-v9';

import type { UnprovenOffer } from '../../v8.js';
import { assembleCallPrototype } from '../shared/assemble-call';
import { assertComposeEnvelope } from '../shared/compose-options';
import type { CallTranscriptSource } from '../shared/compose-types';
import { aggregateUnshieldedOffers } from '../shared/unshielded';
import { entryPointName } from '../shared/verifier-keys';
import type { ProtocolV8 } from './load';

/**
 * Everything {@link composeV8CallTx} needs to assemble one v8-native call
 * transaction. `contractState` is the v8-native `ContractState` the call is
 * dispatched against, as read from chain — it is used only to look up the
 * `ContractOperation` for `circuitId`, so it must carry the operation a real
 * deploy registered, including its verifier key. A constructor-built state
 * will not do: it declares its entry points with blank keys.
 *
 * The call's own inputs are carried as plain data rather than as a whole
 * execution transcript — never a live pre-fork handle.
 *
 * The two Zswap offers are v8-native offer HANDLES, not bytes. Absent offers
 * are the normal shape of a call that moved no shielded coins.
 *
 * `networkId` and `ttl` carry the caller's policy decisions (which network,
 * how long the transaction lives); their well-formedness is checked here — see
 * `assertComposeEnvelope` (`../shared/compose-options.ts`).
 *
 * @see {@link EraSeam}
 * @see {@link ComposeRefusalOrder}
 */
export interface ComposeV8CallOptions {
  readonly circuitId: string;
  readonly contractAddress: string;
  readonly contractState: InstanceType<ProtocolV8['ContractState']>;
  readonly transcript: CallTranscriptSource;
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  readonly communicationCommitmentRandomness?: string;
  readonly networkId: string;
  readonly ttl: Date;
  readonly guaranteedZswapOffer?: UnprovenOffer;
  readonly fallibleZswapOffer?: UnprovenOffer;
}

/**
 * Composes a v8-native call transaction from one call's inputs and immediately
 * serializes it. The call prototype comes from {@link assembleCallPrototype}
 * against the injected v8 module.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called.
 *
 * @param options The call's inputs, offers and envelope options.
 * @param v8 The v8 ledger module, as handed over by `loadLedger8`
 *   (`./load.ts`).
 * @returns The UNPROVEN, serialized call transaction.
 * @throws ComposeOptionError If `networkId` is empty or `ttl` is not a valid
 *   instant.
 * @throws ComposeFailedError If `contractState` has no registered operation for
 *   `circuitId` (stage `'call-operation'`), or the operation it does have
 *   carries no verifier key (stage `'call-verifier-key'`), plus every stage
 *   {@link assembleCallPrototype} and {@link aggregateUnshieldedOffers} raise.
 * @see {@link ComposeRefusalOrder}
 */
export const composeV8CallTx = (options: ComposeV8CallOptions, v8: ProtocolV8): Uint8Array => {
  const { contractAddress, contractState, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  assertComposeEnvelope(options, 'v8');

  const prototype = assembleCallPrototype(v8, {
    circuitId: options.circuitId,
    contractAddress,
    transcript: options.transcript,
    privateTranscriptOutputs: options.privateTranscriptOutputs,
    input: options.input,
    output: options.output,
    communicationCommitmentRandomness: options.communicationCommitmentRandomness,
    operations: contractState,
    stage: 'call-operation',
    version: 'v8'
  });

  const intent = v8.Intent.new(ttl).addCall(prototype);

  // Read the partitioned pair back off the intent rather than re-deriving it,
  // and attach the payout on this era too -- see ComposeRefusalOrder.
  const unshielded = aggregateUnshieldedOffers(
    intent.actions
      .filter((action) => action instanceof v8.ContractCall)
      .map((call) => ({
        circuitId: entryPointName(call.entryPoint),
        guaranteed: call.guaranteedTranscript,
        fallible: call.fallibleTranscript
      })),
    v8,
    'v8'
  );
  if (unshielded.guaranteed !== undefined) {
    intent.guaranteedUnshieldedOffer = unshielded.guaranteed;
  }
  if (unshielded.fallible !== undefined) {
    intent.fallibleUnshieldedOffer = unshielded.fallible;
  }

  return v8.Transaction.fromPartsRandomized(networkId, guaranteedZswapOffer, fallibleZswapOffer, intent).serialize();
};
