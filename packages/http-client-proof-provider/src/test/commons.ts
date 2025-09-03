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

import { Transaction } from '@midnight-ntwrk/ledger';
import { createProverKey, createVerifierKey, createZKIR, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-types';
import fs from 'fs/promises';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const resourceDir = `${currentDir}/resources`;
const SET_TOPIC_CIRCUIT_ID = 'set_topic';
const UNPROVEN_TX = 'unproven_tx_set_topic';
const PAYLOAD = 'payload_set_topic';

export const getValidZKConfig = async () => ({
  circuitId: SET_TOPIC_CIRCUIT_ID,
  proverKey: createProverKey(await fs.readFile(`${resourceDir}/keys/${SET_TOPIC_CIRCUIT_ID}.prover`)),
  verifierKey: createVerifierKey(await fs.readFile(`${resourceDir}/keys/${SET_TOPIC_CIRCUIT_ID}.verifier`)),
  zkir: createZKIR(await fs.readFile(`${resourceDir}/zkir/${SET_TOPIC_CIRCUIT_ID}.bzkir`))
});

export const getValidUnprovenTx = async (): Promise<UnprovenTransaction> =>
  Transaction.deserialize('signature', 'pre-proof', 'pre-binding', await fs.readFile(`${resourceDir}/${UNPROVEN_TX}`));

export const getValidPayload = async () => fs.readFile(`${resourceDir}/${PAYLOAD}`);
