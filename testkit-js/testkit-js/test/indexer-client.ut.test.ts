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

import { IndexerClient } from '../src/client/indexer-client';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('[Unit tests] IndexerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('health should keep credentials on the request and keep them out of the log', async () => {
    const logger = pino({ level: 'silent' });
    const info = vi.spyOn(logger, 'info');
    mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });
    const client = new IndexerClient('https://midnight-preview.blockfrost.io/api/v0?project_id=secret', logger);

    await client.health();

    expect(mockedAxios.get).toHaveBeenCalledWith('https://midnight-preview.blockfrost.io/ready?project_id=secret', {
      timeout: 1000
    });
    expect(info.mock.calls.flat().join(' ')).not.toContain('secret');
  });
});
