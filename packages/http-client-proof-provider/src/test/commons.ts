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

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { constructorContext } from '@midnight-ntwrk/compact-runtime';
import {
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type UnprovenTransaction,
  ZswapChainState
} from '@midnight-ntwrk/ledger-v6';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProverKey, createVerifierKey, createZKIR } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import fs from 'fs/promises';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const resourceDir = `${currentDir}/resources`;

const CONTRACT = `simple`;
const CIRCUIT_ID = 'add';

export const getValidZKConfig = async () => ({
  circuitId: CIRCUIT_ID,
  proverKey: createProverKey(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/keys/${CIRCUIT_ID}.prover`)),
  verifierKey: createVerifierKey(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/keys/${CIRCUIT_ID}.verifier`)),
  zkir: createZKIR(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/zkir/${CIRCUIT_ID}.bzkir`))
});

/**
 * Creates a valid UnprovenTransaction for testing using proper object construction
 * from the topic contract instead of binary data.
 */
export const getValidUnprovenTx = async (): Promise<UnprovenTransaction> => {
  const contractModule = await import(`${resourceDir}/managed/${CONTRACT}/contract/index.cjs`);
  const contract = new contractModule.Contract({});
  const coinPublicKey = sampleCoinPublicKey();

  const constructorResult = contract.initialState(
    constructorContext(
      undefined,
      parseCoinPublicKeyToHex(coinPublicKey, getNetworkId())
    )
  );

  const initialContractState = constructorResult.currentContractState;

  const callOptions = {
    contract,
    circuitId: CIRCUIT_ID,
    contractAddress: sampleContractAddress(),
    coinPublicKey,
    initialContractState,
    initialZswapChainState: new ZswapChainState(),
    arguments: []
  };

  const result = createUnprovenCallTxFromInitialStates(
    callOptions,
    coinPublicKey,
    sampleEncryptionPublicKey()
  );

  return result.private.unprovenTx;
};

