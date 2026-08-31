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

import { ledger, UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { DeserializationError, TagParseError } from '@midnight-ntwrk/midnight-js-utils';
import type { DocumentNode } from 'graphql';
import { describe, expect, test, vi } from 'vitest';

import { parseHexContractState } from '../codec';
import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { CONTRACT_AND_ZSWAP_STATE_QUERY, CONTRACT_STATE_QUERY, HEAD_PROTOCOL_VERSION_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  mintV8ContractStateHex,
  mintV9ContractStateHex,
  mintV9TransactionHex,
  UNRESOLVABLE_PROTOCOL_VERSION,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

const dispatchingQuery = (responses: ReadonlyMap<DocumentNode, unknown>): QueryMock =>
  vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockImplementation(({ query }: ApolloRequest) => {
    if (!responses.has(query)) {
      return Promise.reject(new Error('test setup: no response registered for the requested document'));
    }
    return Promise.resolve(responses.get(query));
  });

const buildProvider = (query: QueryMock): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ query }), 1000);

const headRequestCount = (query: QueryMock): number =>
  query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY).length;

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

describe('era cross-check on the contract-state decode path', () => {
  test('decodes a state whose envelope and reported era agree on the supported era', () => {
    const hexState = mintV9ContractStateHex();

    const state = parseHexContractState(hexState, V9_ERA_PROTOCOL_VERSION);

    // Round-tripped rather than merely non-null: proves the bytes really went
    // through the v9 runtime instead of being handed back untouched.
    expect(Buffer.from(state.serialize()).toString('hex')).toBe(hexState);
  });

  test('refuses a state the indexer dates to an era the bytes contradict', async () => {
    // The dangerous direction: the indexer says the newer era while the bytes
    // are from the older one, so an era-blind decode produces garbage rather
    // than an error.
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState(mintV9ContractStateHex(), V8_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: V8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      envelopeVersion: 'v9'
    });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses older-era bytes the indexer dates to the newer era', async () => {
    const rejection = await rejectionOf(
      mintV8ContractStateHex().then((hex) => parseHexContractState(hex, V9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: V9_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v9',
      envelopeVersion: 'v8'
    });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a consistently older-era state instead of decoding it with the newer runtime', async () => {
    // Both signals agree on v8, and there is still no v8 decoder on this path.
    // Failing here is the whole point: the alternative is a wrong answer.
    const rejection = await rejectionOf(
      mintV8ContractStateHex().then((hex) => parseHexContractState(hex, V8_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'unsupported-decode-era',
      version: 'v8'
    });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a payload that is not a contract state at all, before any decode', async () => {
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState(mintV9TransactionHex(), V9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(TagParseError);
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a state that is not hex-encoded, before it can be silently truncated', async () => {
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState('not-hex-at-all', V9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-state-encoding' });
  });

  test('propagates an unresolvable protocol version rather than guessing an era', async () => {
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState(mintV9ContractStateHex(), UNRESOLVABLE_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(UnknownProtocolVersionError);
  });
});

describe('queryContractState dates the state it decodes', () => {
  const stateResponse = (state: string | null, protocolVersion: number | null): unknown => ({
    data: {
      block: protocolVersion === null ? null : { protocolVersion },
      contract: state === null ? null : { state }
    }
  });

  test('returns the decoded state when the era checks out', async () => {
    const hexState = mintV9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(hexState, V9_ERA_PROTOCOL_VERSION)]])
    );

    const state = await buildProvider(query).queryContractState(ADDRESS);

    expect(Buffer.from(state?.serialize() ?? new Uint8Array()).toString('hex')).toBe(hexState);
  });

  test('reports no state at an address the indexer has nothing for', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(null, V9_ERA_PROTOCOL_VERSION)]])
    );

    expect(await buildProvider(query).queryContractState(ADDRESS)).toBeNull();
  });

  test('fails rather than decode a state the indexer served with no block to date it', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(mintV9ContractStateHex(), null)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'missing-head-block' });
  });

  test('refuses an older-era state instead of returning a mis-decoded one', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(await mintV8ContractStateHex(), V8_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'unsupported-decode-era', version: 'v8' });
  });

  test('corroborates the head era, so the next head read costs no request', async () => {
    // The reason the field is worth selecting: an unpinned state read now
    // carries the same evidence the raw path does - a head reading plus an
    // envelope that agrees with it - so it engages the head cache.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_QUERY, stateResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, { data: { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION } } }]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryContractState(ADDRESS);
    const before = headRequestCount(query);
    const cached = await provider.queryLatestProtocolVersion();

    expect(cached).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(before);
  });

  test('does not corroborate from a state read pinned to a specific block', async () => {
    // A pinned read's block field is not the head, so it proves nothing about
    // where the network is now.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_QUERY, stateResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, { data: { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION } } }]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 });
    const before = headRequestCount(query);
    await provider.queryLatestProtocolVersion();

    expect(headRequestCount(query)).toBe(before + 1);
  });
});

describe('queryZSwapAndContractState dates the triple it decodes', () => {
  const tripleResponse = (state: string, protocolVersion: number): unknown => ({
    data: {
      block: {
        protocolVersion,
        ledgerParameters: Buffer.from(ledger.LedgerParameters.initialParameters().serialize()).toString('hex'),
        contractZswapState: Buffer.from(new ledger.ZswapChainState().serialize()).toString('hex')
      },
      contract: { state }
    }
  });

  test('returns the triple when the era checks out', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, tripleResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)]])
    );

    const triple = await buildProvider(query).queryZSwapAndContractState(ADDRESS);

    expect(triple).not.toBeNull();
    expect(triple).toHaveLength(3);
  });

  test('refuses the triple when the block dates it to an unsupported era', async () => {
    const query = dispatchingQuery(
      new Map([
        [CONTRACT_AND_ZSWAP_STATE_QUERY, tripleResponse(await mintV8ContractStateHex(), V8_ERA_PROTOCOL_VERSION)]
      ])
    );

    const rejection = await rejectionOf(buildProvider(query).queryZSwapAndContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'unsupported-decode-era', version: 'v8' });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });
});
