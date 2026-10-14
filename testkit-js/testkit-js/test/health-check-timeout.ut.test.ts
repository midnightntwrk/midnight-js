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

import axios from 'axios';
import pino from 'pino';

import { FaucetClient } from '../src/client/faucet-client';
import { IndexerClient } from '../src/client/indexer-client';
import { NodeClient } from '../src/client/node-client';
import { ProofServerClient } from '../src/client/proof-server-client';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const logger = pino({ level: 'silent' });

describe('[Unit tests] Health check timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });
  });

  it.each([
    ['node', () => new NodeClient('http://localhost:9944', logger, 'undeployed')],
    ['indexer', () => new IndexerClient('http://localhost:8088/api/v3/graphql', logger)],
    ['proof server', () => new ProofServerClient('http://localhost:6300', logger)],
    ['faucet', () => new FaucetClient('http://localhost:3000/api/faucet', logger)]
  ])('%s health check waits up to 10 seconds', async (_service, createClient) => {
    await createClient().health();

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), { timeout: 10_000 });
  });
});
