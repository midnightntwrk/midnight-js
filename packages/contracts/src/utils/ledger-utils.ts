/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/compact-js';
import { type Contract, ProvableCircuitId, VerifierKey as ContractVerifierKey } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  type AlignedValue,
  type CoinPublicKey,
  type ContractAddress,
  ContractState,
  type Op,
  type QueryContext,
  type SigningKey,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import {
  ChargedState,
  communicationCommitmentRandomness,
  ContractDeploy,
  ContractState as LedgerContractState,
  type EncPublicKey,
  Intent,
  type LedgerParameters,
  type MaintenanceUpdate,
  PrePartitionContractCall,
  PreTranscript,
  QueryContext as LedgerQueryContext,
  StateValue as LedgerStateValue,
  type UnprovenTransaction,
  type ZswapChainState
} from '@midnight-ntwrk/ledger-v8';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type AnyProvableCircuitId,
  asContractAddress,
  asEffectOption,
  makeContractExecutableRuntime,
  Transaction,
  type VerifierKey,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

import { zswapStateToOffer } from './zswap-utils';

export const toLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize());

export const fromLedgerContractState = (contractState: LedgerContractState): ContractState =>
  ContractState.deserialize(contractState.serialize(), );

export const toLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext => {
  const stateValue = LedgerStateValue.decode(queryContext.state.state.encode());
  const ledgerQueryContext = new LedgerQueryContext(new ChargedState(stateValue), queryContext.address);
  // The above method of converting to ledger query context only retains the state. So, we have to set the settable properties manually
  ledgerQueryContext.block = queryContext.block;
  ledgerQueryContext.effects = queryContext.effects;
  return ledgerQueryContext;
}

export const createUnprovenLedgerDeployTx = (
  contractState: ContractState,
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
): [ContractAddress, ContractState, UnprovenTransaction] => {
  const contractDeploy = new ContractDeploy(toLedgerContractState(contractState));
  return [
    contractDeploy.address,
    fromLedgerContractState(contractDeploy.initialState),
    Transaction.fromParts(
      getNetworkId(),
      zswapStateToOffer(zswapLocalState, encryptionPublicKey),
      undefined,
      Intent.new(ttlOneHour()).addDeploy(contractDeploy)
    )
  ];
}

export const createUnprovenLedgerCallTx = (
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  publicTranscript: Op<AlignedValue>[],
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey,
  ledgerParameters: LedgerParameters
): UnprovenTransaction => {
  const ledgerContractState = toLedgerContractState(initialContractState);
  const op = ledgerContractState.operation(circuitId);
  assertDefined(op, `Operation '${circuitId}' is undefined for contract state ${initialContractState.toString(false)}`);

  const queryContext = new LedgerQueryContext(ledgerContractState.data, contractAddress);
  queryContext.block = {
    ...queryContext.block,
    balance: ledgerContractState.balance,
    ownAddress: contractAddress,
    secondsSinceEpoch: BigInt(Math.floor(Date.now() / 1_000)),
  };
  const preTranscript = new PreTranscript(queryContext, publicTranscript);

  const call = new PrePartitionContractCall(
    contractAddress,
    circuitId,
    op,
    preTranscript,
    privateTranscriptOutputs,
    input,
    output,
    communicationCommitmentRandomness(),
    circuitId
  );

  return Transaction.fromPartsRandomized(
    getNetworkId(),
    zswapStateToOffer(nextZswapLocalState, encryptionPublicKey, {
      contractAddress,
      zswapChainState
    }),
    undefined
  ).addCalls(
    { tag: 'random' },
    [call],
    ledgerParameters,
    ttlOneHour()
  );
};

// Utilities for unproven transactions for the single contract updates above.

export const unprovenTxFromContractUpdates = async (
  updateAndSignFn: () => Promise<MaintenanceUpdate>
): Promise<UnprovenTransaction> => {
  return Transaction.fromParts(
    getNetworkId(),
    undefined,
    undefined,
    Intent.new(ttlOneHour()).addMaintenanceUpdate(await updateAndSignFn())
  );
};

export const createUnprovenReplaceAuthorityTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  newAuthority: SigningKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.replaceContractMaintenanceAuthority(
      asEffectOption(newAuthority),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
}

export const createUnprovenRemoveVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.removeContractOperation(
      ProvableCircuitId(operation),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
}

export const createUnprovenInsertVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  newVk: VerifierKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.addOrReplaceContractOperation(
      ProvableCircuitId(operation),
      ContractVerifierKey(newVk),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
}
