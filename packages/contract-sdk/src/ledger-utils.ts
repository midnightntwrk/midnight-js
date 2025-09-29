/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import {
  type AlignedValue,
  type ContractAddress,
  type ContractState,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import type { ZswapChainState } from '@midnight-ntwrk/ledger';
import {
  communicationCommitmentRandomness,
  ContractCallPrototype,
  ContractCallsPrototype,
} from '@midnight-ntwrk/ledger';
import {
  type PartitionedTranscript,
  toLedgerContractState,
  zswapStateToOffer
} from '@midnight-ntwrk/midnight-js-contract-core';
import { type ImpureCircuitId, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';
import { type EncPublicKey } from '@midnight-ntwrk/zswap';

export const createUnprovenLedgerCallTx = (
  circuitId: ImpureCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  partitionedTranscript: PartitionedTranscript,
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
): UnprovenTransaction => {
  const op = toLedgerContractState(initialContractState).operation(circuitId);
  assertDefined(op, `Operation '${circuitId}' is undefined for contract state ${initialContractState.toString(false)}`);
  return new UnprovenTransaction(
    zswapStateToOffer(nextZswapLocalState, encryptionPublicKey, {
      contractAddress,
      zswapChainState
    }),
    undefined,
    new ContractCallsPrototype().addCall(
      new ContractCallPrototype(
        contractAddress,
        circuitId,
        op,
        partitionedTranscript[0],
        partitionedTranscript[1],
        privateTranscriptOutputs,
        input,
        output,
        communicationCommitmentRandomness(),
        circuitId
      )
    )
  );
};
