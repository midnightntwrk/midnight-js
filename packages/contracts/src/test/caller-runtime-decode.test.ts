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
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  createVerifierKey,
  type ProverKey,
  SerializedContractState,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { createLedger9UnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import { readHfHexFixture } from './ledger8-replay';
import * as ShieldedMap from './resources/compiled/shielded-map/contract/index.js';
import { createMockCoinPublicKey, createMockEncryptionPublicKey, MOCK_CONFIG } from './test-mocks';

const SHIELDED_MAP = fileURLToPath(new URL('./resources/compiled/shielded-map/contract/index.js', import.meta.url));

const DEPOSIT_VERIFIER_KEY = createVerifierKey(
  new Uint8Array(readFileSync(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url)))
);

class ShieldedMapKeys extends ZKConfigProvider<string> {
  getZKIR(): Promise<ZKIR> {
    throw new Error('not read by a deploy');
  }
  getProverKey(): Promise<ProverKey> {
    throw new Error('not read by a deploy');
  }
  getVerifierKey(): Promise<VerifierKey> {
    return Promise.resolve(DEPOSIT_VERIFIER_KEY);
  }
  override getArtifactRuntimeVersion(): Promise<string> {
    return Promise.resolve('0.20.0');
  }
}

const deployedShieldedMap = async (): Promise<SerializedContractState<'v9'>> => {
  const compiledContract = CompiledContract.make<ShieldedMap.Contract<undefined>>('shielded-map', ShieldedMap.Contract).pipe(
    CompiledContract.withWitnesses({ dummy: (ctx): [undefined, []] => [ctx.privateState, []] }),
    CompiledContract.withCompiledFileAssets(fileURLToPath(new URL('./resources/compiled/shielded-map', import.meta.url)))
  );
  const deploy = await createLedger9UnprovenDeployTxFromVerifierKeys(
    new ShieldedMapKeys(),
    createMockCoinPublicKey(),
    { compiledContract, signingKey: sampleSigningKey() },
    createMockEncryptionPublicKey(),
    MOCK_CONFIG
  );
  return deploy.public.initialContractState;
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
  it('decodes the state of a ledger 9 deploy handle in another runtime copy and passes it to the ledger() of that copy', async () => {
    const handleState = await deployedShieldedMap();

    const answer = await decodeInOwnRuntime(handleState);

    expect(answer).toEqual({ decodedBy: 'compact-runtime', ledgerAccepted: true });
  });

  it('decodes ledger 8 state bytes, as a ledger 8 handle carries them, in another ledger 8 runtime copy', async () => {
    const bytes = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const { ContractState: Ledger8ContractState } = await loadLedger8Protocol();
    const handleState = SerializedContractState.fromBytes('v8', bytes);

    const answer = await decodeInOwnRuntime(handleState);

    expect(answer).toEqual({ decodedBy: 'ledger-v8', operations: Ledger8ContractState.deserialize(bytes).operations().length });
  });
});
