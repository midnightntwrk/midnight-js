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

import axios from 'axios';
import pino from 'pino';

import { FaucetClient } from '@/client/faucet-client';
import { IndexerClient } from '@/client/indexer-client';
import { NodeClient } from '@/client/node-client';
import { ProofServerClient } from '@/client/proof-server-client';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const logger = pino({ level: 'silent' });

describe('[Unit tests] Client error propagation', () => {
  describe('FaucetClient', () => {
    it('requestTokens should throw when faucet request fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Connection refused'));

      const client = new FaucetClient('http://localhost:3000', logger);

      await expect(client.requestTokens('addr123')).rejects.toThrow('Connection refused');
    });

    it('health should throw when faucet is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new FaucetClient('http://localhost:3000', logger);

      await expect(client.health()).rejects.toThrow('ECONNREFUSED');
    });

    it('health should use the protocol from the configured URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const client = new FaucetClient('http://localhost:3000/api/faucet', logger);
      await client.health();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/api/health', expect.anything());
    });
  });

  describe('ProofServerClient', () => {
    it('proveTx should throw when proof server request fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Proof generation failed'));

      const client = new ProofServerClient('http://localhost:6300', logger);

      await expect(client.proveTx(new ArrayBuffer(0))).rejects.toThrow('Proof generation failed');
    });

    it('health should throw when proof server is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new ProofServerClient('http://localhost:6300', logger);

      await expect(client.health()).rejects.toThrow('ECONNREFUSED');
    });

    it('health should use the protocol from the configured URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const client = new ProofServerClient('http://localhost:6300', logger);
      await client.health();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:6300/health', expect.anything());
    });
  });

  describe('IndexerClient', () => {
    it('health should throw when indexer is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new IndexerClient('http://localhost:8088', logger);

      await expect(client.health()).rejects.toThrow('ECONNREFUSED');
    });

    it('health should use the protocol from the configured URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const client = new IndexerClient('http://localhost:8088/api/v4/graphql', logger);
      await client.health();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8088/ready', expect.anything());
    });
  });

  describe('NodeClient', () => {
    it('health should throw when node is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new NodeClient('http://localhost:9944', logger);

      await expect(client.health()).rejects.toThrow('ECONNREFUSED');
    });

    it('health should use the protocol from the configured URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const client = new NodeClient('http://localhost:9944', logger);
      await client.health();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:9944/health', expect.anything());
    });
  });
});
