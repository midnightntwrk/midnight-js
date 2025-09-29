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

import type { AlignedValue, Op, StateValue,ZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import type { CoinInfo, UnprovenTransaction } from '@midnight-ntwrk/ledger';
import { type PartitionedTranscript } from '@midnight-ntwrk/midnight-js-contract-core';
import type {
  CircuitReturnType,
  Contract,
  FinalizedTxData,
  ImpureCircuitId,
  PrivateState
} from '@midnight-ntwrk/midnight-js-types';

/**
 * Data relevant to any unsubmitted transaction.
 */
export type UnsubmittedTxData = {
  /**
   * The unproven ledger transaction produced.
   */
  readonly unprovenTx: UnprovenTransaction;
  /**
   * New coins created during the construction of the transaction.
   */
  readonly newCoins: CoinInfo[];
}


/**
 * Data for an unsubmitted call transaction.
 */
export type UnsubmittedCallTxData<C extends Contract, ICK extends ImpureCircuitId<C>> = CallResult<C, ICK> & {
  /**
   * Private data relevant to this call transaction.
   */
  readonly private: UnsubmittedTxData;
};

/**
 * Data for a submitted, finalized call transaction.
 */
export type FinalizedCallTxData<C extends Contract, ICK extends ImpureCircuitId<C>> = UnsubmittedCallTxData<C, ICK> & {
  /**
   * Public data relevant to this call transaction.
   */
  readonly public: FinalizedTxData;
};



/**
 * The private (sensitive) portions of the call result.
 */
export type CallResultPrivate<C extends Contract, ICK extends ImpureCircuitId<C>> = {
  /**
   * ZK representation of the circuit arguments.
   */
  readonly input: AlignedValue;
  /**
   * ZK representation of the circuit result.
   */
  readonly output: AlignedValue;
  /**
   * ZK representation of the circuit witness call results.
   */
  readonly privateTranscriptOutputs: AlignedValue[];
  /**
   * The JS representation of the input to the circuit.
   */
  readonly result: CircuitReturnType<C, ICK>;
  /**
   * The private state resulting from executing the circuit.
   */
  readonly nextPrivateState: PrivateState<C>;
  /**
   * The Zswap local state resulting from executing the circuit.
   */
  readonly nextZswapLocalState: ZswapLocalState;
};


/**
 * The public portions of the call result.
 */
export type CallResultPublic = {
  /**
   * The public state resulting from executing the circuit.
   */
  readonly nextContractState: StateValue;
  /**
   * The public transcript resulting from executing the circuit.
   */
  readonly publicTranscript: Op<AlignedValue>[];
  /**
   * A {@link publicTranscript} partitioned into guaranteed and fallible sections.
   * The guaranteed section of a public transcript must succeed for the corresponding
   * transaction to be considered valid. The fallible section of a public transcript
   * can fail without invalidating the transaction, as long as the guaranteed section succeeds.
   */
  readonly partitionedTranscript: PartitionedTranscript;
};

/**
 * Contains all information resulting from circuit execution.
 */
export type CallResult<C extends Contract, ICK extends ImpureCircuitId<C>> = {
  /**
   * The public/non-sensitive data produced by the circuit execution.
   */
  readonly public: CallResultPublic;
  /**
   * The private/sensitive data produced by the circuit execution.
   */
  readonly private: CallResultPrivate<C, ICK>;
};
