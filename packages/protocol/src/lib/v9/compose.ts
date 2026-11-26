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

import { ComposeFailedError, ComposeOptionError, NO_CIRCUIT } from '../../errors';
import { assembleCallPrototype } from '../shared/assemble-call';
import { assertComposeEnvelope } from '../shared/compose-options';
import type {
  ComposeCallOptions,
  ComposeCallResultPojo,
  ComposeDeployOptions,
  DeployResultPojo,
  PartitionedCallTranscript
} from '../shared/compose-types';
import { aggregateUnshieldedOffers } from '../shared/unshielded';
import { entryPointName, resolveVerifierKeyRegistrations } from '../shared/verifier-keys';

// A rejected state is an option error; see ComposeRefusalOrder.
const readContractState = (raw: Uint8Array): ledgerV9.ContractState => {
  try {
    return ledgerV9.ContractState.deserialize(raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', 'contractStateBytes', cause);
  }
};

// An absent offer stays absent; unreadable bytes are an option error.
const readZswapOffer = (
  raw: Uint8Array | undefined,
  option: 'zswapOffer' | 'guaranteedZswapOfferBytes'
): ledgerV9.UnprovenOffer | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return ledgerV9.ZswapOffer.deserialize('pre-proof', raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', option, cause);
  }
};

// Never proves: returns the UNPROVEN serialization. Refusals: see ComposeRefusalOrder.
export const composeLedger9CallTx = (options: ComposeCallOptions): ComposeCallResultPojo => {
  const { calls, networkId, ttl, zswapOffer } = options;
  assertComposeEnvelope(options, 'v9');
  if (calls.length === 0) {
    throw new ComposeFailedError('v9', 'call-empty', NO_CIRCUIT);
  }

  let intent = ledgerV9.Intent.new(ttl);
  const partitions: PartitionedCallTranscript[] = [];
  for (const call of calls) {
    const { prototype, partition } = assembleCallPrototype(ledgerV9, {
      circuitId: call.circuitId,
      contractAddress: call.contractAddress,
      transcript: call.transcript,
      privateTranscriptOutputs: call.privateTranscriptOutputs,
      input: call.input,
      output: call.output,
      communicationCommitmentRandomness: call.communicationCommitmentRandomness,
      ledgerParametersBytes: call.ledgerParametersBytes,
      operations: readContractState(call.contractStateBytes),
      stage: 'call-operation',
      version: 'v9'
    });
    partitions.push(partition);
    intent = intent.addCall(prototype);
  }

  // Read the partitioned pairs back off the intent rather than re-deriving
  // them -- see ComposeRefusalOrder.
  const unshielded = aggregateUnshieldedOffers(
    intent.actions
      .filter((action) => action instanceof ledgerV9.ContractCall)
      .map((call) => ({
        circuitId: entryPointName(call.entryPoint),
        guaranteed: call.guaranteedTranscript,
        fallible: call.fallibleTranscript
      })),
    ledgerV9,
    'v9'
  );
  if (unshielded.guaranteed !== undefined) {
    intent.guaranteedUnshieldedOffer = unshielded.guaranteed;
  }
  if (unshielded.fallible !== undefined) {
    intent.fallibleUnshieldedOffer = unshielded.fallible;
  }

  // Last, after the payout, so both eras refuse in one order; see ComposeRefusalOrder.
  const offers = zswapOffer?.(partitions);
  const guaranteedOffer = readZswapOffer(offers?.guaranteedBytes, 'zswapOffer');
  const fallibleOffer = readZswapOffer(offers?.fallibleBytes, 'zswapOffer');

  return {
    txBytes: ledgerV9.Transaction.fromPartsRandomized(networkId, guaranteedOffer, fallibleOffer, intent).serialize(),
    partitions
  };
};

// Registers against the map resolveVerifierKeyRegistrations validated; see VerifierKeys.
const registerVerifierKeys = (
  contractState: ledgerV9.ContractState,
  verifierKeys: ReadonlyMap<string, Uint8Array>
): void => {
  for (const { entryPoint, circuitId, verifierKey } of resolveVerifierKeyRegistrations(
    contractState.operations(),
    verifierKeys,
    'v9'
  )) {
    const operation = new ledgerV9.ContractOperation();
    try {
      operation.verifierKey = verifierKey;
    } catch (cause) {
      throw new ComposeFailedError('v9', 'deploy-verifier-key-blob', circuitId, cause);
    }
    contractState.setOperation(entryPoint, operation);
  }
};

// Refuses a blank-keyed entry point when no key map was supplied; see VerifierKeys.
const assertStateCarriesKeys = (contractState: ledgerV9.ContractState): void => {
  for (const entryPoint of contractState.operations()) {
    // `?.` is deliberate here, unlike in `../shared/contract-state.ts`, and so
    // is raising the OPTION error rather than the `'deploy-verifier-key'` stage
    // -- see VerifierKeys.
    if (contractState.operation(entryPoint)?.verifierKey === undefined) {
      throw new ComposeOptionError('v9', 'verifierKeys');
    }
  }
};

// Never proves. Without `verifierKeys` the state is deployed as given, which assertStateCarriesKeys
// checks. See VerifierKeys.
export const composeLedger9DeployTx = (options: ComposeDeployOptions): DeployResultPojo => {
  const { contractStateBytes, verifierKeys, networkId, ttl, guaranteedZswapOfferBytes } = options;
  assertComposeEnvelope(options, 'v9');

  const guaranteedOffer = readZswapOffer(guaranteedZswapOfferBytes, 'guaranteedZswapOfferBytes');
  const state = readContractState(contractStateBytes);
  if (verifierKeys === undefined) {
    assertStateCarriesKeys(state);
  } else {
    registerVerifierKeys(state, verifierKeys);
  }

  const deploy = new ledgerV9.ContractDeploy(state);
  const intent = ledgerV9.Intent.new(ttl).addDeploy(deploy);

  return {
    txBytes: ledgerV9.Transaction.fromParts(networkId, guaranteedOffer, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialContractStateBytes: deploy.initialState.serialize()
  };
};
