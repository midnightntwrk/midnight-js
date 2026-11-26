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

import { assembleCallPrototype } from '../shared/assemble-call';
import type { LedgerParametersOption } from '../shared/compose-types';
import type { TranscriptPojo } from '../v8/executable';

/**
 * Everything `wrapKeepStateCall` needs. `contractState` is the migrated v9
 * state, which must already register the operation for `transcript.circuitId`.
 */
export interface WrapKeepStateCallOptions {
  readonly transcript: TranscriptPojo;
  readonly contractAddress: string;
  readonly contractState: ledgerV9.ContractState;
  /**
   * The ledger parameters of the block this call is built against, or
   * {@link INITIAL_LEDGER_PARAMETERS}. The transcript is partitioned against them.
   */
  readonly ledgerParametersBytes: LedgerParametersOption;
}

// Refuses rather than falling back to a blank, unverifiable operation; see Ledger8Execution.
export const wrapKeepStateCall = (options: WrapKeepStateCallOptions): ledgerV9.ContractCallPrototype => {
  const { transcript, contractAddress, contractState, ledgerParametersBytes } = options;
  const { prototype } = assembleCallPrototype(ledgerV9, {
    circuitId: transcript.circuitId,
    contractAddress,
    // The ledger 8 execution leg partitions nothing: it always submits the raw
    // op sequence as `'unpartitioned'` -- see Ledger8Execution.
    transcript: {
      kind: 'unpartitioned',
      preState: transcript.preContractState.encode(),
      publicTranscript: transcript.publicTranscript,
      partitionContext: transcript.partitionContext
    },
    privateTranscriptOutputs: transcript.privateTranscriptOutputs,
    input: transcript.input,
    output: transcript.output,
    operations: contractState,
    ledgerParametersBytes,
    stage: 'wrap-call',
    version: 'v9'
  });

  return prototype;
};
