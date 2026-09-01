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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV9 from '@midnightntwrk/ledger-v9';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DownConvertedState } from '../lib/engine/down-convert';
import type { TranscriptPojo } from '../lib/engine/execute';
import { emptyZswapLocalState } from './fixtures';

// A REGISTERED key, not a blank operation: assembleCallPrototype rejects a
// key-less operation before it ever partitions a transcript (stage
// 'call-verifier-key'), so a blank one would make this test assert that guard
// instead of the partition guard it exists for.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT });
const buildState = (byte: number): DownConvertedState => ({ data: new ocrt3.ChargedState(ocrt3.StateValue.newCell(fieldValue(byte))) });

const buildTranscript = (): TranscriptPojo => ({
  circuitId: 'increment',
  result: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  publicTranscript: [],
  privateTranscriptOutputs: [],
  preContractState: buildState(0x01),
  postContractState: buildState(0x02),
  privateStateAfter: {},
  zswapLocalState: emptyZswapLocalState()
});

// Lives in its own file so the mocked, poisoned `@midnightntwrk/ledger-v9`
// module registry cannot leak into engine-wrap-v9.test.ts's happy-path suite
// (vitest isolates module state per test file) — same isolation precedent as
// load-v8-failure.test.ts.
describe('wrapKeepStateCall defensive guard', () => {
  afterEach(() => {
    vi.doUnmock('@midnightntwrk/ledger-v9');
  });

  it('throws when partitionTranscripts returns no result for the single call submitted', async () => {
    vi.doMock('@midnightntwrk/ledger-v9', async (importOriginal) => {
      const actual = await importOriginal<typeof LedgerV9>();
      return { ...actual, partitionTranscripts: () => [] };
    });
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    // A real verifier key, not a blank operation: the verifier-key guard in
    // assemble-call.ts runs first and would otherwise short-circuit this test
    // before partitionTranscripts is ever reached.
    const op = new LedgerV9.ContractOperation();
    op.verifierKey = readFileSync(
      resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
    );
    const contractState = new LedgerV9.ContractState();
    const operation = new LedgerV9.ContractOperation();
    operation.verifierKey = REGISTERED_VERIFIER_KEY;
    contractState.setOperation('increment', operation);

    expect(() =>
      wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: LedgerV9.sampleContractAddress(), contractState })
    ).toThrow(/partitionTranscripts returned no result/);
  });
});
