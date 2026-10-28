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
import type { VersionedContractState, VersionedPublicStates } from '@midnight-ntwrk/midnight-js-types';
import { DeserializationError, deserializeCompactContractState, TagParseError } from '@midnight-ntwrk/midnight-js-utils';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { parseHexContractState } from '../codec';
import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { CONTRACT_AND_ZSWAP_STATE_QUERY, CONTRACT_STATE_QUERY, HEAD_PROTOCOL_VERSION_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  LEDGER8_ERA_PROTOCOL_VERSION,
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger8ContractStateBytes,
  mintLedger8ContractStateHex,
  mintLedger8LedgerParametersBytes,
  mintLedger8LedgerParametersHex,
  mintLedger9ContractStateHex,
  mintLedger9LedgerParametersHex,
  mintLedger9TransactionHex,
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

const stateHex = (state: VersionedContractState | null): { version: string; hex: string } | null => {
  if (state === null) return null;
  switch (state.version) {
    case 'v8':
      return { version: 'v8', hex: Buffer.from(state.stateBytes).toString('hex') };
    case 'v9':
      return { version: 'v9', hex: Buffer.from(state.state.serialize()).toString('hex') };
  }
};

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

describe('era cross-check on the contract-state decode path', () => {
  test('decodes a state whose envelope and reported era agree on the supported era', () => {
    const hexState = mintLedger9ContractStateHex();

    const state = parseHexContractState(hexState, LEDGER9_ERA_PROTOCOL_VERSION);

    // Round-tripped rather than merely non-null: proves the bytes really went
    // through the v9 runtime instead of being handed back untouched.
    expect(Buffer.from(state.serialize()).toString('hex')).toBe(hexState);
  });

  test('refuses a state whose bytes are newer than the block that dates them', async () => {
    // Impossible on a consistent indexer: a state cannot have been written by
    // a runtime the dating block had not forked to yet. Era only moves
    // forward, so this is the one direction that really is an indexer fault.
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      envelopeVersion: 'v9'
    });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('treats older bytes under a newer block as an undecodable era, not an indexer fault', async () => {
    // Older bytes under a newer block: a record of a pre-fork action read under
    // a post-fork block, or an indexer older than 4.4.0-rc.6 serving a contract
    // untouched since the fork (midnight-indexer #1605). The parser alone
    // cannot tell those apart from an ordinary pre-fork read, so the caller is
    // told the thing it can act on - this era is not decodable here - instead
    // of being sent to hunt a phantom inconsistency.
    const rejection = await rejectionOf(
      mintLedger8ContractStateHex().then((hex) => parseHexContractState(hex, LEDGER9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'unsupported-decode-era',
      version: 'v8'
    });
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a consistently older-era state instead of decoding it with the newer runtime', async () => {
    // Both signals agree on v8, and there is still no v8 decoder on this path.
    // Failing here is the whole point: the alternative is a wrong answer.
    const rejection = await rejectionOf(
      mintLedger8ContractStateHex().then((hex) => parseHexContractState(hex, LEDGER8_ERA_PROTOCOL_VERSION))
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
      Promise.resolve().then(() => parseHexContractState(mintLedger9TransactionHex(), LEDGER9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(TagParseError);
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a state that is not hex-encoded, before it can be silently truncated', async () => {
    const rejection = await rejectionOf(
      Promise.resolve().then(() => parseHexContractState('not-hex-at-all', LEDGER9_ERA_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-state-encoding' });
  });

  test('decodes on the envelope alone when the reported version resolves to no era', () => {
    // The envelope is self-describing and the decoder is tag-strict, so an
    // unresolvable reported version withholds only the upper-bound check, not
    // the safety of the decode. Refusing here would strand a perfectly
    // readable state behind an integer this client happens not to map.
    const hexState = mintLedger9ContractStateHex();

    const state = parseHexContractState(hexState, UNRESOLVABLE_PROTOCOL_VERSION);

    expect(Buffer.from(state.serialize()).toString('hex')).toBe(hexState);
  });

  test('still refuses an undecodable envelope when the reported version resolves to no era', async () => {
    const rejection = await rejectionOf(
      mintLedger8ContractStateHex().then((hex) => parseHexContractState(hex, UNRESOLVABLE_PROTOCOL_VERSION))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'unsupported-decode-era',
      version: 'v8'
    });
  });
});

describe('withholding the envelope upper bound', () => {
  test('decodes bytes newer than the reported block when the bound is withheld', () => {
    // The state and the version that dates it came from Query-root fields the
    // indexer resolved independently, both following the chain tip, so the
    // fork block can be indexed between the two reads. The indexer is fine
    // and the envelope is decodable, so the read has to succeed.
    const hexState = mintLedger9ContractStateHex();

    const state = parseHexContractState(hexState, LEDGER8_ERA_PROTOCOL_VERSION, { upperBound: 'skip' });

    expect(Buffer.from(state.serialize()).toString('hex')).toBe(hexState);
  });

  test('still refuses an undecodable envelope when the bound is withheld', async () => {
    // Withholding the bound must not weaken the decodability gate. That gate
    // reads the envelope, which comes off the bytes themselves and is
    // therefore never subject to the race the bound is withheld for.
    const rejection = await rejectionOf(
      mintLedger8ContractStateHex().then((hex) =>
        parseHexContractState(hex, LEDGER9_ERA_PROTOCOL_VERSION, { upperBound: 'skip' })
      )
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'unsupported-decode-era',
      version: 'v8'
    });
  });
});

describe('queryContractState dates the state it decodes', () => {
  const stateResponse = (state: string | null, protocolVersion: number | null): unknown => ({
    data: {
      block: protocolVersion === null ? null : { protocolVersion },
      contract: state === null ? null : { state }
    }
  });

  test('returns a v9 state decoded, tagged v9', async () => {
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(hexState, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    const state = await buildProvider(query).queryContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v9', hex: hexState });
  });

  test('reports no state at an address the indexer has nothing for', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(null, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    expect(await buildProvider(query).queryContractState(ADDRESS)).toBeNull();
  });

  test('fails rather than decode a state the indexer served with no block to date it', async () => {
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(mintLedger9ContractStateHex(), null)]])
    );

    const rejection = await rejectionOf(buildProvider(query).queryContractState(ADDRESS));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'undated-state' });
  });

  test('returns a v8 state as the stored bytes, tagged v8, instead of refusing it', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const query = dispatchingQuery(new Map([[CONTRACT_STATE_QUERY, stateResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]]));

    const state = await buildProvider(query).queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 });

    expect(stateHex(state)).toEqual({ version: 'v8', hex: hexState });
  });

  test('an unpinned state read leaves a head read costing a request of its own', async () => {
    // The per-read `protocolVersion` answers the era of these bytes. It is not
    // a reading of where the network is now, and must not stand in for one.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_QUERY, stateResponse(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION)],
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

  test('decodes an unpinned read whose dating block reports an unresolvable version', async () => {
    // The decode is safe on the envelope alone: a version this client cannot
    // place on the era timeline must not fail a read whose bytes are readable.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [CONTRACT_STATE_QUERY, stateResponse(mintLedger9ContractStateHex(), UNRESOLVABLE_PROTOCOL_VERSION)]
      ])
    );

    await expect(buildProvider(query).queryContractState(ADDRESS)).resolves.not.toBeNull();
  });

  test('decodes an unpinned read whose state is newer than the block dating it', async () => {
    // The regression this guards: `block` and `contract` are independently
    // resolved siblings and an unpinned read lets both follow the chain tip,
    // so the fork block can land between them. This is the default read path
    // - `findDeployedContract` and the governance flows all reach it with no
    // offset - and it must not throw on a state it can decode.
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const state = await buildProvider(query).queryContractState(ADDRESS);

    expect(stateHex(state)).toEqual({ version: 'v9', hex: hexState });
  });

  test('refuses a pinned read whose state is newer than the block dating it', async () => {
    // With an offset both root fields resolve against one fixed block, so they
    // cannot straddle a boundary. Bytes newer than that block really are an
    // indexer fault, and this is where the bound still earns its place.
    const query = dispatchingQuery(
      new Map([[CONTRACT_STATE_QUERY, stateResponse(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const rejection = await rejectionOf(
      buildProvider(query).queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 })
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      envelopeVersion: 'v9'
    });
  });
});

describe('queryZSwapAndContractState dates the triple it decodes', () => {
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

  const publicStatesSummary = (
    states: VersionedPublicStates | null
  ): { version: string; state: string; parameters: string } | null => {
    if (states === null) return null;
    switch (states.version) {
      case 'v8':
        return {
          version: 'v8',
          state: Buffer.from(states.stateBytes).toString('hex'),
          parameters: Buffer.from(states.ledgerParametersBytes).toString('hex')
        };
      case 'v9':
        return {
          version: 'v9',
          state: Buffer.from(states.contractState.serialize()).toString('hex'),
          parameters: Buffer.from(states.ledgerParameters.serialize()).toString('hex')
        };
    }
  };

  test('returns every state decoded, tagged v9, when the block is a v9 block', async () => {
    const hexState = mintLedger9ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(hexState, LEDGER9_ERA_PROTOCOL_VERSION)]])
    );

    const states = await buildProvider(query).queryZSwapAndContractState(ADDRESS);

    expect(publicStatesSummary(states)).toEqual({
      version: 'v9',
      state: hexState,
      parameters: mintLedger9LedgerParametersHex()
    });
  });

  test('returns the contract state and the parameters as stored bytes, tagged v8, when the block is a v8 block', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const query = dispatchingQuery(
      new Map([[CONTRACT_AND_ZSWAP_STATE_QUERY, await tripleResponse(hexState, LEDGER8_ERA_PROTOCOL_VERSION)]])
    );

    const states = await buildProvider(query).queryZSwapAndContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 });

    expect(publicStatesSummary(states)).toEqual({
      version: 'v8',
      state: hexState,
      parameters: Buffer.from(await mintLedger8LedgerParametersBytes()).toString('hex')
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
      envelopeVersion: 'v9'
    });
  });
});

describe('the decoder on this path is tag-strict', () => {
  test('rejects genuine older-era bytes instead of mis-decoding them', async () => {
    // Pins the fact the era guard is reasoned from. A wrong-era contract state
    // cannot be silently mis-decoded: the envelope tag is checked before the
    // body is read, so the guard buys a typed, actionable failure - not
    // protection from a plausible-looking wrong answer. If a runtime bump ever
    // relaxes that check, the guard's justification changes, and this is where
    // that shows up.
    const ledger8Bytes = await mintLedger8ContractStateBytes();

    const rejection = await rejectionOf(
      Promise.resolve().then(() =>
        deserializeCompactContractState(ledger8Bytes, { caller: 'era-cross-check.test:tag-strictness' })
      )
    );

    expect(rejection).toBeInstanceOf(DeserializationError);
    expect(((rejection as Error).cause as Error | undefined)?.message).toContain('midnight:contract-state[v6]:');
  });
});

describe('watchForContractState dates the state it decodes', () => {
  test('decodes a state newer than the block dating it', async () => {
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

  test('returns a v8 state as the stored bytes, tagged v8', async () => {
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
