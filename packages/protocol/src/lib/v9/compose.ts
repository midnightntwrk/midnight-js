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
import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from '../shared/compose-types';
import { aggregateUnshieldedOffers } from '../shared/unshielded';
import { entryPointName, resolveVerifierKeyRegistrations } from '../shared/verifier-keys';

/**
 * Bridges a raw, serialized contract state into the v9 era, reporting a
 * rejected envelope as {@link ComposeOptionError} -- see ComposeRefusalOrder.
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
 * before `.prove()` is ever called.
 *
 * @param options The calls to compose and the transaction-wide envelope.
 * @returns The serialized UNPROVEN transaction.
 * @throws ComposeFailedError if the call list is empty (stage `'call-empty'`)
 * or a call cannot be assembled; `stage` names which step refused it.
 * @throws ComposeOptionError if the network id, the ttl, a Zswap offer or a
 * call's contract state is unusable.
 * @see {@link ComposeRefusalOrder}
 */
export const composeV9CallTx = (options: ComposeCallOptions): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  assertComposeEnvelope(options, 'v9');
  if (calls.length === 0) {
    throw new ComposeFailedError('v9', 'call-empty', NO_CIRCUIT);
  }

  // Read both offers before composing anything -- see ComposeRefusalOrder.
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

  return ledgerV9.Transaction.fromPartsRandomized(networkId, guaranteedOffer, fallibleOffer, intent).serialize();
};

/**
 * Registers a verifier key for every entry point the state declares, against
 * the map validated by {@link resolveVerifierKeyRegistrations} -- see
 * VerifierKeys.
 */
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

/**
 * Refuses a state that still declares an entry point with a blank verifier key
 * when no key map was supplied -- see VerifierKeys.
 */
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

/**
 * Composes a v9-native deploy transaction from a serialized initial contract
 * state and immediately serializes it, returning the transaction together with
 * the address the deployment will have and the initial state that address is
 * derived from.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called.
 *
 * With `verifierKeys` supplied, every declared entry point is registered before
 * the address is derived. Without it, the state is deployed exactly as given —
 * which is checked rather than assumed, see {@link assertStateCarriesKeys}.
 *
 * @param options The serialized initial state, its verifier keys, and the
 * transaction-wide envelope.
 * @returns The serialized UNPROVEN transaction, the address the deployment
 * will have, and the initial state that address was derived from.
 * @throws ComposeFailedError if the supplied keys do not match the state's
 * declared entry points, or if the ledger rejects a key blob; `stage` names
 * which check refused it.
 * @throws ComposeOptionError if the network id, the ttl, the Zswap offer or
 * the state bytes are unusable, or if `verifierKeys` was omitted for a state
 * that still declares a blank key.
 * @see {@link VerifierKeys}
 * @see {@link ComposeRefusalOrder}
 */
export const composeV9DeployTx = (options: ComposeDeployOptions): DeployResultPojo => {
  const { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  assertComposeEnvelope(options, 'v9');

  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer);
  const state = readContractState(contractState);
  if (verifierKeys === undefined) {
    assertStateCarriesKeys(state);
  } else {
    registerVerifierKeys(state, verifierKeys);
  }

  const deploy = new ledgerV9.ContractDeploy(state);
  const intent = ledgerV9.Intent.new(ttl).addDeploy(deploy);

  return {
    transaction: ledgerV9.Transaction.fromParts(networkId, guaranteedOffer, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialState: deploy.initialState.serialize()
  };
};
