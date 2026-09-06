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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { DocumentNode } from 'graphql';
import { describe, expect, test, vi } from 'vitest';

import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { BLOCK_QUERY, CONTRACT_AND_ZSWAP_STATE_QUERY, HEAD_PROTOCOL_VERSION_QUERY } from '../query-definitions';
import type { ApolloHandle } from '../transport';
import { V9_ERA_PROTOCOL_VERSION } from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;

/** Builds a provider whose Apollo client's `query` is the supplied mock. */
const providerWithQuery = (query: ReturnType<typeof vi.fn>): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider({ client: { query } } as unknown as ApolloHandle, 1000);

type QueryRequest = { readonly query: DocumentNode };

/**
 * A `query` mock that answers per document, so a method issuing more than one
 * request can be driven (and counted) without depending on call order.
 * An unregistered document is a test-setup mistake and fails loudly rather
 * than resolving to `undefined`.
 */
const dispatchingQuery = (responses: ReadonlyMap<DocumentNode, unknown>): ReturnType<typeof vi.fn> =>
  vi.fn().mockImplementation(({ query }: QueryRequest) => {
    if (!responses.has(query)) {
      return Promise.reject(new Error('test setup: no response registered for the requested document'));
    }
    return Promise.resolve(responses.get(query));
  });

const headResponse = (protocolVersion: number | null): unknown => ({
  data: { block: protocolVersion === null ? null : { protocolVersion } }
});

describe('IndexerPublicDataProvider query methods', () => {
  describe('queryBlock', () => {
    test('maps a block-height config to a height offset and returns the block hash and height', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: { hash: '0xabc', height: 42 } } });

      const result = await providerWithQuery(query).queryBlock({ type: 'blockHeight', blockHeight: 42 });

      expect(result).toEqual({ hash: '0xabc', height: 42 });
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ query: BLOCK_QUERY, variables: { offset: { height: 42 } } })
      );
    });

    test('maps a block-hash config to a hash offset', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: { hash: '0xabc', height: 1 } } });

      await providerWithQuery(query).queryBlock({ type: 'blockHash', blockHash: '0xdeadbeef' });

      expect(query).toHaveBeenCalledWith(expect.objectContaining({ variables: { offset: { hash: '0xdeadbeef' } } }));
    });

    test('uses a null (latest) offset when no config is given', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: { hash: '0x1', height: 1 } } });

      await providerWithQuery(query).queryBlock();

      expect(query).toHaveBeenCalledWith(expect.objectContaining({ variables: { offset: null } }));
    });

    test('returns null when the indexer has no matching block', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: null } });

      expect(await providerWithQuery(query).queryBlock({ type: 'blockHeight', blockHeight: 999 })).toBeNull();
    });
  });

  describe('queryZSwapAndContractState', () => {
    test('composes block and contract in one request, mapping the offset', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: null, contract: null } });

      await providerWithQuery(query).queryZSwapAndContractState(ADDRESS, { type: 'blockHash', blockHash: '0xfeed' });

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: CONTRACT_AND_ZSWAP_STATE_QUERY,
          variables: { address: ADDRESS, offset: { hash: '0xfeed' } }
        })
      );
    });

    test('uses a null (latest) offset when no config is given', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: null, contract: null } });

      await providerWithQuery(query).queryZSwapAndContractState(ADDRESS);

      expect(query).toHaveBeenCalledWith(expect.objectContaining({ variables: { address: ADDRESS, offset: null } }));
    });

    test('returns null when there is no block at the offset', async () => {
      const query = vi.fn().mockResolvedValue({ data: { block: null, contract: { state: 'aa' } } });

      expect(await providerWithQuery(query).queryZSwapAndContractState(ADDRESS)).toBeNull();
    });

    test('returns null when the contract state is absent at the offset', async () => {
      const query = vi.fn().mockResolvedValue({
        data: { block: { ledgerParameters: 'aa', contractZswapState: 'bb' }, contract: null }
      });

      expect(await providerWithQuery(query).queryZSwapAndContractState(ADDRESS)).toBeNull();
    });

    test('returns null when the contract has no zswap state at the block (contract absent as of that block)', async () => {
      const query = vi.fn().mockResolvedValue({
        data: { block: { ledgerParameters: 'aa', contractZswapState: null }, contract: { state: 'bb' } }
      });

      expect(await providerWithQuery(query).queryZSwapAndContractState(ADDRESS)).toBeNull();
    });
  });
  describe('queryLatestProtocolVersion', () => {
    test('reads the version off the head block, asking for no offset so the indexer serves the latest', async () => {
      const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));

      const version = await providerWithQuery(query).queryLatestProtocolVersion();

      expect(version).toBe(V9_ERA_PROTOCOL_VERSION);
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ query: HEAD_PROTOCOL_VERSION_QUERY, fetchPolicy: 'no-cache' })
      );
    });

    test('fails fast when the indexer reports no head block at all', async () => {
      const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(null)]]));

      const rejection = await providerWithQuery(query)
        .queryLatestProtocolVersion()
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'missing-head-block' });
    });

    test('issues a request on every call, whatever era the head reports', async () => {
      const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));
      const provider = providerWithQuery(query);

      await provider.queryLatestProtocolVersion();
      await provider.queryLatestProtocolVersion();

      expect(query).toHaveBeenCalledTimes(2);
    });
  });
});
