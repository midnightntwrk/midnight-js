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

import { NodeClient } from '@/client/node-client';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const logger = pino({ level: 'silent' });

describe('[Unit tests] NodeClient', () => {
  const nodeURL = 'http://localhost:9944';
  let client: NodeClient;

  beforeEach(() => {
    client = new NodeClient(nodeURL, logger);
    vi.clearAllMocks();
  });

  it('ledgerStateBlob should pass blockHash to RPC call', async () => {
    const blockHash = '0xabc123';
    mockedAxios.post.mockResolvedValue({
      data: { result: '0001deadbeef' },
      statusText: 'OK'
    });

    await client.ledgerStateBlob(blockHash);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      nodeURL,
      expect.objectContaining({
        method: 'midnight_getLedgerState',
        params: [blockHash]
      }),
      expect.anything()
    );
  });

  it('ledgerVersion should pass blockHash to RPC call', async () => {
    const blockHash = '0xdef456';
    mockedAxios.post.mockResolvedValue({
      data: { result: 'v1.0.0' },
      statusText: 'OK'
    });

    await client.ledgerVersion(blockHash);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      nodeURL,
      expect.objectContaining({
        method: 'midnight_ledgerVersion',
        params: [blockHash]
      }),
      expect.anything()
    );
  });
});
