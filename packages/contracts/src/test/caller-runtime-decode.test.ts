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

import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { SerializedContractState } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { readHfHexFixture } from './ledger8-replay';

const SHIELDED_MAP = fileURLToPath(new URL('./resources/compiled/shielded-map/contract/index.js', import.meta.url));

interface ShieldedMapModule {
  readonly Contract: new (witnesses: { dummy: (ctx: { privateState: undefined }) => [undefined, []] }) => {
    initialState(context: {
      initialPrivateState: undefined;
      initialZswapLocalState: { coinPublicKey: string; outputs: []; inputs: []; currentIndex: bigint };
    }): Promise<{ currentContractState: ContractState }>;
  };
}

const constructedState = async (): Promise<ContractState> => {
  const module: ShieldedMapModule = await import(/* @vite-ignore */ SHIELDED_MAP);
  const contract = new module.Contract({ dummy: (ctx) => [ctx.privateState, []] });
  const { currentContractState } = await contract.initialState({
    initialPrivateState: undefined,
    initialZswapLocalState: { coinPublicKey: '00'.repeat(32), outputs: [], inputs: [], currentIndex: 0n }
  });
  return currentContractState;
};

// A worker has a module graph and WASM instances of its own, so what it imports is a runtime copy
// distinct from the one this process decodes with: the situation of a dApp whose package manager
// did not dedupe the runtime.
const decodeInOwnRuntime = (state: SerializedContractState): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./resources/decode-in-own-runtime.mjs', import.meta.url), {
      workerData: { era: state.era, bytes: state.serialize(), contractModule: SHIELDED_MAP }
    });
    worker.once('message', (message: unknown) => {
      resolve(message);
      void worker.terminate();
    });
    worker.once('error', reject);
  });

describe('a dApp decodes initialContractState with a runtime copy of its own', () => {
  it('decodes a ledger 9 state in another runtime copy and passes it to the ledger() of that copy', async () => {
    const handleState = SerializedContractState.fromBytes('v9', (await constructedState()).serialize());

    const answer = await decodeInOwnRuntime(handleState);

    expect(answer).toEqual({ decodedBy: 'compact-runtime', ledgerAccepted: true });
  });

  it('decodes a ledger 8 state in another ledger 8 runtime copy', async () => {
    const bytes = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const { ContractState: Ledger8ContractState } = await loadLedger8Protocol();
    const handleState = SerializedContractState.fromBytes('v8', bytes);

    const answer = await decodeInOwnRuntime(handleState);

    expect(answer).toEqual({ decodedBy: 'ledger-v8', operations: Ledger8ContractState.deserialize(bytes).operations().length });
  });
});
