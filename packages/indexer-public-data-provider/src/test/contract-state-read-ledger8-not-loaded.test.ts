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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { LEDGER_STATE_TAGS } from '@midnight-ntwrk/midnight-js-protocol/version';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, test, vi } from 'vitest';

import { IndexerPublicDataProvider } from '../provider';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import { LEDGER8_ERA_PROTOCOL_VERSION } from './state-fixtures';

const ledger8Import = vi.hoisted(() => vi.fn());

vi.mock('@midnightntwrk/ledger-v8', async (importOriginal) => {
  ledger8Import();
  return importOriginal();
});

const ADDRESS = '12'.repeat(32) as ContractAddress;
const v8Hex = (tag: string): string => toHex(new TextEncoder().encode(`${tag}:body`));

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// A file of its own: the v8 ledger, once loaded, stays loaded for the process. The tests run in
// order, and the last one loads it to prove the mock above sees a load.
describe('a read of a v8 state', () => {
  test('serves the state and the ledger parameters without loading the v8 ledger', async () => {
    const query = vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue({
      data: {
        block: { protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION, ledgerParameters: v8Hex(LEDGER_STATE_TAGS.LedgerParameters.v8) },
        contract: { state: v8Hex(LEDGER_STATE_TAGS.ContractState.v8) }
      }
    });

    const record = await new IndexerPublicDataProvider(stubApolloHandle({ query }), 1000).queryContractState(ADDRESS);

    expect(record?.contractState.era).toBe('v8');
    expect(record?.ledgerParameters?.era).toBe('v8');
    await settle();
    expect(ledger8Import).not.toHaveBeenCalled();
  });

  test('sees the v8 ledger load when it is loaded', async () => {
    await loadLedger8Protocol();

    expect(ledger8Import).toHaveBeenCalledOnce();
  });
});
