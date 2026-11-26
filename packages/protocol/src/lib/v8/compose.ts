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

import { ComposeOptionError } from '../../errors';
import type { UnprovenOffer } from '../../v8.js';
import { assembleCallPrototype } from '../shared/assemble-call';
import { assertComposeEnvelope } from '../shared/compose-options';
import type {
  CallTranscriptSource,
  ComposeCallResultPojo,
  LedgerParametersOption,
  ZswapOfferFactory
} from '../shared/compose-types';
import { aggregateUnshieldedOffers } from '../shared/unshielded';
import { entryPointName } from '../shared/verifier-keys';
import type { Ledger8Protocol } from './load';

// An absent offer stays absent; unreadable bytes are an option error (see ComposeRefusalOrder).
export const readZswapOffer = (
  raw: Uint8Array | undefined,
  v8: Ledger8Protocol,
  option: 'zswapOffer' | 'guaranteedZswapOfferBytes'
): UnprovenOffer | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return v8.ZswapOffer.deserialize('pre-proof', raw);
  } catch (cause) {
    throw new ComposeOptionError('v8', option, cause);
  }
};

// `contractState` must be read from chain: a constructor-built state has blank keys (see VerifierKeys).
export interface ComposeLedger8CallOptions {
  readonly circuitId: string;
  readonly contractAddress: string;
  readonly contractState: InstanceType<Ledger8Protocol['ContractState']>;
  readonly transcript: CallTranscriptSource;
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  readonly communicationCommitmentRandomness?: string;
  // Required; see LedgerParametersOption.
  readonly ledgerParametersBytes: LedgerParametersOption;
  readonly networkId: string;
  readonly ttl: Date;
  readonly zswapOffer?: ZswapOfferFactory;
}

// Never proves: returns the UNPROVEN serialization. Refusals: see ComposeRefusalOrder.
export const composeLedger8CallTx = (options: ComposeLedger8CallOptions, v8: Ledger8Protocol): ComposeCallResultPojo => {
  const { contractAddress, contractState, networkId, ttl, zswapOffer } = options;
  assertComposeEnvelope(options, 'v8');

  const { prototype, partition } = assembleCallPrototype(v8, {
    circuitId: options.circuitId,
    contractAddress,
    transcript: options.transcript,
    privateTranscriptOutputs: options.privateTranscriptOutputs,
    input: options.input,
    output: options.output,
    communicationCommitmentRandomness: options.communicationCommitmentRandomness,
    ledgerParametersBytes: options.ledgerParametersBytes,
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

  // Built only once the call is split, which is the whole point of taking a
  // factory -- see ComposeRefusalOrder.
  const offers = zswapOffer?.([partition]);
  const guaranteedOffer = readZswapOffer(offers?.guaranteedBytes, v8, 'zswapOffer');
  const fallibleOffer = readZswapOffer(offers?.fallibleBytes, v8, 'zswapOffer');

  return {
    txBytes: v8.Transaction.fromPartsRandomized(networkId, guaranteedOffer, fallibleOffer, intent).serialize(),
    partitions: [partition]
  };
};
