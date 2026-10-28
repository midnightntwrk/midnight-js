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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { type ContractStateRead, InvalidLedgerStateError, type PublicStatesRead } from '@midnight-ntwrk/midnight-js-types';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import {
  CONTRACT_AND_ZSWAP_STATE_QUERY,
  CONTRACT_STATE_WITH_PARAMETERS_QUERY,
  HEAD_PROTOCOL_VERSION_QUERY
} from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  LEDGER8_ERA_PROTOCOL_VERSION,
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger8ContractStateHex,
  mintLedger8LedgerParametersBytes,
  mintLedger8LedgerParametersHex,
  mintLedger9ContractStateHex,
  mintLedger9LedgerParametersHex,
  mintLedger9ZswapChainStateHex,
  UNRESOLVABLE_PROTOCOL_VERSION} from './state-fixtures';

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

const stateHex = (read: ContractStateRead | null): { version: string; hex: string } | null =>
  read === null
    ? null
    : { version: read.contractState.era, hex: Buffer.from(read.contractState.serialize()).toString('hex') };

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

describe('queryContractState dates the state it reads', () => {
  let ledger8ParametersHex: string;

  beforeAll(async () => {
    ledger8ParametersHex = await mintLedger8LedgerParametersHex();
  });

  // A block carries the parameters of its own era.
  const stateResponse = (state: string | null, protocolVersion: number | null): unknown => ({
    data: {
      block:
        protocolVersion === null
          ? null
          : {
              protocolVersion,
              ledgerParameters:
                protocolVersion === LEDGER8_ERA_PROTOCOL_VERSION ? ledger8ParametersHex : mintLedger9LedgerParametersHex()
            },
      contract: state === null ? null : { state }
    }
  });

  test('returns a v9 state as bytes, tagged v9', async () => {
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(hexState, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    const state = await buildProvider(query).queryContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v9', hex: hexState });
  });

  test('reports no state at an address the indexer has nothing for', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(null, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    expect(await buildProvider(query).queryContractState(ADDRESS)).toBeNull();
  });

  test('fails on a state the indexer served with no block to date it', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(mintLedger9ContractStateHex(), null)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'undated-state' });
  });

  test('returns a v8 state as bytes, tagged v8', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const query = dispatchingQuery(new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]]));

    const state = await buildProvider(query).queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 });

    expect(stateHex(state)).toEqual({ version: 'v8', hex: hexState });
  });

  test('an unpinned state read leaves a head read costing a request of its own', async () => {
    // The per-read `protocolVersion` answers the era of these bytes. It is not
    // a reading of where the network is now, and must not stand in for one.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, { data: { block: { protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION } } }]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryContractState(ADDRESS);
    const before = headRequestCount(query);
    const head = await provider.queryLatestProtocolVersion();

    expect(head).toBe(LEDGER9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(before + 1);
  });

  test('serves an unpinned read whose dating block reports an unresolvable version', async () => {
    // The version tag alone says who wrote the bytes: a version this client
    // cannot place on the era timeline must not fail the read.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(mintLedger9ContractStateHex(), UNRESOLVABLE_PROTOCOL_VERSION)]
      ])
    );

    await expect(buildProvider(query).queryContractState(ADDRESS)).resolves.not.toBeNull();
  });

  test('serves an unpinned read whose state is newer than the block dating it', async () => {
    // The regression this guards: `block` and `contract` are independently
    // resolved siblings and an unpinned read lets both follow the chain tip,
    // so the fork block can land between them. This is the default read path
    // - `findDeployedContract` and the governance flows all reach it with no
    // offset - and it must not throw on a readable state.
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const state = await buildProvider(query).queryContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v9', hex: hexState });
  });

  test('refuses a pinned read whose state is newer than the block dating it', async () => {
    // With an offset both root fields resolve against one fixed block, so they
    // cannot straddle a boundary. Bytes newer than that block really are an
    // indexer fault, and this is where the bound still earns its place.
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_WITH_PARAMETERS_QUERY, stateResponse(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(
      buildProvider(query).queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 })
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      stateVersion: 'v9'
    });
  });
});

describe('queryZSwapAndContractState dates the triple it reads', () => {
  // The block's parameters are minted by the era the block's own `protocolVersion` names, because
  // that is what a chain serves: ledger parameters are era-tagged and served PER BLOCK. An earlier
  // version of this fixture served current-era parameters under a pre-fork block, which is a shape
  // no chain produces -- and, being the only pre-fork triple under test, it let the parameters
  // decode pass on bytes the real thing would have refused.
  const tripleResponse = async (state: string, protocolVersion: number): Promise<unknown> => ({
    data: {
      block: {
        protocolVersion,
        ledgerParameters:
          protocolVersion === LEDGER8_ERA_PROTOCOL_VERSION
            ? await mintLedger8LedgerParametersHex()
            : mintLedger9LedgerParametersHex(),
        contractZswapState: mintLedger9ZswapChainStateHex()
      },
      contract: { state }
    }
  });

  const publicStatesSummary = (states: PublicStatesRead | null) =>
    states === null
      ? null
      : {
          versions: [states.contractState.era, states.ledgerParameters.era, states.zswapChainState.era],
          state: Buffer.from(states.contractState.serialize()).toString('hex'),
          parameters: Buffer.from(states.ledgerParameters.serialize()).toString('hex'),
          zswap: Buffer.from(states.zswapChainState.serialize()).toString('hex')
        };

  test('returns every state as bytes, tagged v9, when the block is a v9 block', async () => {
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(hexState, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    const states = await buildProvider(query).queryZSwapAndContractState(ADDRESS);

    expect(publicStatesSummary(states)).toEqual({
      versions: ['v9', 'v9', 'v9'],
      state: hexState,
      parameters: mintLedger9LedgerParametersHex(),
      zswap: mintLedger9ZswapChainStateHex()
    });
  });

  test('returns every state as bytes, tagged v8, when the block is a v8 block, the zswap state taking the era of the parameters', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const states = await buildProvider(query).queryZSwapAndContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 });

    expect(publicStatesSummary(states)).toEqual({
      versions: ['v8', 'v8', 'v8'],
      state: hexState,
      parameters: Buffer.from(await mintLedger8LedgerParametersBytes()).toString('hex'),
      zswap: mintLedger9ZswapChainStateHex()
    });
  });

  test('refuses an unpinned read whose v9 state was served beside a v8 block\'s parameters', async () => {
    // `contract` is its own root field, so an unpinned read can resolve a state written after the
    // fork beside a block from before it. The state's upper-bound check is withheld for that race,
    // but the two halves are still from different eras and no one value can carry both.
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryZSwapAndContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'mixed-era-public-states',
      stateVersion: 'v9',
      parametersVersion: 'v8'
    });
  });

  test('refuses a v8 state served beside a v9 block\'s parameters', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(await mintLedger8ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryZSwapAndContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'mixed-era-public-states',
      stateVersion: 'v8',
      parametersVersion: 'v9'
    });
  });

  const tripleWithZswap = (contractZswapState: string): unknown => ({
    data: {
      block: {
        protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION,
        ledgerParameters: mintLedger9LedgerParametersHex(),
        contractZswapState
      },
      contract: { state: mintLedger9ContractStateHex() }
    }
  });

  test('refuses a zswap chain state that is not hex-encoded', async () => {
    const query = dispatchingQuery(new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, tripleWithZswap('zz')]]));

    const rejection = await rejectionOf(buildProvider(query).queryZSwapAndContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-zswap-encoding' });
  });

  test('refuses a zswap chain state that holds bytes of another kind, as an indexer fault', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, tripleWithZswap(mintLedger9ContractStateHex())]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryZSwapAndContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-zswap-state', era: 'v9' });
    expect((rejection as IndexerDataError).cause).toBeInstanceOf(InvalidLedgerStateError);
  });

  test('refuses a pinned triple whose state is newer than the block dating it', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(
      buildProvider(query).queryZSwapAndContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 })
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      stateVersion: 'v9'
    });
  });
});

describe('watchForContractState dates the state it reads', () => {
  test('serves a state newer than the block dating it', async () => {
    // `waitForContractToAppear` is hardwired to an unpinned read, so unlike
    // the two query paths this one is exposed to the sibling race with no
    // caller-facing way to opt out of it.
    const hexState = mintLedger9ContractStateHex();
    const watchQuery = vi.fn().mockReturnValue(
      Rx.of({
        data: {
          block: { protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION },
          contract: { state: hexState }
        },
        dataState: 'complete',
        loading: false,
        networkStatus: 7,
        partial: false
      })
    );
    const provider = new IndexerPublicDataProvider(stubApolloHandle({ watchQuery }), 1000);

    const state = await provider.watchForContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v9', hex: hexState });
  });

  test('returns a v8 state as bytes, tagged v8', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const watchQuery = vi.fn().mockReturnValue(
      Rx.of({
        data: {
          block: { protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION },
          contract: { state: hexState }
        },
        dataState: 'complete',
        loading: false,
        networkStatus: 7,
        partial: false
      })
    );
    const provider = new IndexerPublicDataProvider(stubApolloHandle({ watchQuery }), 1000);

    const state = await provider.watchForContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v8', hex: hexState });
  });
});
