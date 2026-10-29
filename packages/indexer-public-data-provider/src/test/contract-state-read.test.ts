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

import { ledger, loadLedger8Protocol, UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  DeserializationError,
  fromHex,
  hasErrorCode,
  ledgerVersionOfContractState,
  parseSerializedTag,
  toHex,
  UTILS_ERROR_CODES
} from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { CONTRACT_STATE_WITH_PARAMETERS_QUERY,HEAD_PROTOCOL_VERSION_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  LEDGER8_ERA_PROTOCOL_VERSION,
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger8ContractStateHex,
  mintLedger8LedgerParametersHex,
  mintLedger9ContractStateHex,
  mintLedger9LedgerParametersHex,
  UNRESOLVABLE_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

const buildProvider = (query: QueryMock): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ query }), 1000);

let ledger8ParametersHex: string;

beforeAll(async () => {
  ledger8ParametersHex = await mintLedger8LedgerParametersHex();
});

// A block carries the parameters of its own era; `null` serves a block without them.
const parametersOfBlock = (protocolVersion: number | null): string =>
  protocolVersion === LEDGER8_ERA_PROTOCOL_VERSION ? ledger8ParametersHex : mintLedger9LedgerParametersHex();

const composedResponse = (
  state: string | null,
  protocolVersion: number | null,
  ledgerParameters: string | null = parametersOfBlock(protocolVersion)
): unknown => ({
  data: {
    block: protocolVersion === null ? null : { protocolVersion, ...(ledgerParameters === null ? {} : { ledgerParameters }) },
    contract: state === null ? null : { state }
  }
});

const providerServing = (
  state: string | null,
  protocolVersion: number | null,
  ledgerParameters?: string | null
): IndexerPublicDataProvider =>
  buildProvider(
    vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue(composedResponse(state, protocolVersion, ledgerParameters))
  );

// ---------------------------------------------------------------------------
// Adversarial payload construction.
//
// Everything below is built in the indexer's real wire encoding — hex — from
// bytes a ledger runtime actually produced, then mutated at the byte level.
// In hex an ASCII ':' is the two characters `3a`, so a tag boundary is a real,
// addressable position in the served string rather than a JavaScript-level
// abstraction.
// ---------------------------------------------------------------------------

const COLON = 0x3a;
const FULL_STOP = 0x2e;

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/** Re-tags a real serialized state with `tag`, keeping its body byte for byte. */
const retagged = (stateHex: string, tag: string): string => {
  const { body } = parseSerializedTag(new Uint8Array(fromHex(stateHex)));
  return toHex(concatBytes(utf8(`${tag}:`), body));
};

/** Overwrites the second `3a` in the served hex, so no tag boundary is found. */
const withoutSecondColon = (stateHex: string): string => {
  const bytes = new Uint8Array(fromHex(stateHex));
  const secondColon = bytes.indexOf(COLON, bytes.indexOf(COLON) + 1);
  bytes[secondColon] = FULL_STOP;
  return toHex(bytes);
};

describe('contract-state version tags', () => {
  // Pins the tag-to-era table against what the runtimes actually write. A
  // runtime bump that changes the state format version fails here, loudly,
  // instead of turning every state read into a rejected version tag.
  //
  // The table itself is `LEDGER_STATE_TAGS` in `@midnight-ntwrk/midnight-js-protocol`; these
  // assertions exercise `ledgerVersionOfContractState` from `utils`, which reads it, on a real state
  // produced by each runtime.
  test('maps the tag the v9 runtime writes onto the v9 ledger era', () => {
    expect(ledgerVersionOfContractState(new Uint8Array(fromHex(mintLedger9ContractStateHex())))).toBe('v9');
  });

  test('maps the tag the v8 runtime writes onto the v8 ledger era', async () => {
    expect(ledgerVersionOfContractState(new Uint8Array(fromHex(await mintLedger8ContractStateHex())))).toBe('v8');
  });
});

describe('queryContractState', () => {
  describe('composed call path', () => {
    test('asks for the block protocol version, its ledger parameters and the contract state in one request', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION));

      await buildProvider(query).queryContractState(ADDRESS);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: CONTRACT_STATE_WITH_PARAMETERS_QUERY,
          variables: { address: ADDRESS, offset: null },
          fetchPolicy: 'no-cache'
        })
      );
    });

    test('anchors both fields to the same requested offset', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION));

      await buildProvider(query).queryContractState(ADDRESS, { type: 'blockHash', blockHash: '0xfeed' });

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { address: ADDRESS, offset: { hash: '0xfeed' } } })
      );
    });

    test('answers the era from the read itself, and leaves a head read to cost its own request', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION));
      const provider = buildProvider(query);

      const record = await provider.queryContractState(ADDRESS);
      await provider.queryLatestProtocolVersion();

      expect(record?.protocolVersion).toBe(LEDGER9_ERA_PROTOCOL_VERSION);
      expect(query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY)).toHaveLength(1);
    });

    test('returns null when the contract has no state at the offset', async () => {
      expect(await providerServing(null, LEDGER9_ERA_PROTOCOL_VERSION).queryContractState(ADDRESS)).toBeNull();
    });

    test('fails fast when a state is served but the block that dates it is missing', async () => {
      // Returning null here would report "no contract at this address" for
      // what is really an inconsistent indexer — two very different things for
      // a caller to act on.
      const rejection = await providerServing(mintLedger9ContractStateHex(), null)
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'undated-state' });
    });

    test('returns null, without reading a block, when neither the state nor the block is there', async () => {
      expect(await providerServing(null, null).queryContractState(ADDRESS)).toBeNull();
    });
  });

  describe('ledger parameters', () => {
    test('serves the block ledger parameters as bytes with the era that wrote them', async () => {
      const parametersHex = toHex(ledger.LedgerParameters.initialParameters().serialize());

      const record = await providerServing(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION, parametersHex).queryContractState(
        ADDRESS
      );

      expect(record?.ledgerParameters?.kind).toBe('LedgerParameters');
      expect(record?.ledgerParameters?.era).toBe('v9');
      expect(record?.ledgerParameters?.serialize()).toEqual(new Uint8Array(fromHex(parametersHex)));
    });

    test('serves v8 ledger parameters undecoded', async () => {
      const v8 = await loadLedger8Protocol();
      const parametersHex = toHex(v8.LedgerParameters.initialParameters().serialize());

      const record = await providerServing(await mintLedger8ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION, parametersHex).queryContractState(
        ADDRESS
      );

      expect(record?.ledgerParameters?.era).toBe('v8');
    });

    test('refuses a block that carries no ledger parameters', async () => {
      const rejection = await providerServing(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION, null)
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-parameters-encoding' });
    });

    test('refuses ledger parameters of another era than the block that carries them', async () => {
      const parametersHex = toHex((await loadLedger8Protocol()).LedgerParameters.initialParameters().serialize());

      const rejection = await providerServing(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION, parametersHex)
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({
        kind: 'parameters-era-disagreement',
        protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION,
        reportedVersion: 'v9',
        parametersVersion: 'v8'
      });
    });

    test('refuses ledger parameters that are not hex-encoded', async () => {
      const rejection = await providerServing(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION, 'zz')
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-parameters-encoding' });
    });

    test('refuses hex ledger parameters followed by junk, rather than serving the hex prefix', async () => {
      const rejection = await providerServing(
        mintLedger9ContractStateHex(),
        LEDGER9_ERA_PROTOCOL_VERSION,
        `${mintLedger9LedgerParametersHex()}zz`
      )
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-parameters-encoding' });
    });

    test('refuses contract-state bytes served as the ledger parameters', async () => {
      const rejection = await providerServing(
        mintLedger9ContractStateHex(),
        LEDGER9_ERA_PROTOCOL_VERSION,
        mintLedger9ContractStateHex()
      )
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(hasErrorCode(rejection, UTILS_ERROR_CODES.TAG_PARSE_FAILED)).toBe(true);
    });
  });

  describe('both version tags round-trip', () => {
    test('serves v9 state bytes that deserialize again with the v9 runtime', async () => {
      const stateHex = mintLedger9ContractStateHex();

      const record = await providerServing(stateHex, LEDGER9_ERA_PROTOCOL_VERSION).queryContractState(ADDRESS);

      expect(record?.contractState.era).toBe('v9');
      expect(record?.protocolVersion).toBe(LEDGER9_ERA_PROTOCOL_VERSION);
      expect(ledger.ContractState.deserialize(record?.contractState.serialize() ?? new Uint8Array()).serialize()).toEqual(
        new Uint8Array(fromHex(stateHex))
      );
    });

    test('serves v8 state bytes that deserialize again with the v8 runtime', async () => {
      const stateHex = await mintLedger8ContractStateHex();
      const v8 = await loadLedger8Protocol();

      const record = await providerServing(stateHex, LEDGER8_ERA_PROTOCOL_VERSION).queryContractState(ADDRESS);

      expect(record?.contractState.era).toBe('v8');
      expect(record?.protocolVersion).toBe(LEDGER8_ERA_PROTOCOL_VERSION);
      expect(v8.ContractState.deserialize(record?.contractState.serialize() ?? new Uint8Array()).serialize()).toEqual(
        new Uint8Array(fromHex(stateHex))
      );
    });

    test('tags a pre-fork state served under a post-fork block with the era that wrote it', async () => {
      const record = await providerServing(await mintLedger8ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION).queryContractState(
        ADDRESS
      );

      expect(record?.contractState.era).toBe('v8');
      expect(record?.protocolVersion).toBe(LEDGER9_ERA_PROTOCOL_VERSION);
    });

    test('tags an unpinned state newer than its sibling block with the era of its version tag', async () => {
      // Unpinned, `block` and `contract` follow the chain tip independently, so the fork block can
      // land between them. The bound is withheld; the version tag still says who wrote the bytes.
      const record = await providerServing(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION).queryContractState(
        ADDRESS
      );

      expect(record?.contractState.era).toBe('v9');
    });

    test('refuses a pinned state whose version tag is newer than the block that dates it', async () => {
      const rejection = await providerServing(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION)
        .queryContractState(ADDRESS, { type: 'blockHeight', blockHeight: 7 })
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({
        kind: 'era-disagreement',
        protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
        reportedVersion: 'v8',
        stateVersion: 'v9'
      });
    });

    test('tags the state by its version tag when the block reports a version this build cannot place', async () => {
      const record = await providerServing(mintLedger9ContractStateHex(), UNRESOLVABLE_PROTOCOL_VERSION).queryContractState(
        ADDRESS
      );

      expect(record?.contractState.era).toBe('v9');
    });

    test('refuses a malformed protocol version rather than copying it onto the record', async () => {
      const rejection = await providerServing(mintLedger9ContractStateHex(), -1)
        .queryContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-protocol-version', protocolVersion: -1 });
      expect((rejection as IndexerDataError).cause).toBeInstanceOf(UnknownProtocolVersionError);
    });
  });

  describe('adversarial version tags', () => {
    const rejections: readonly (readonly [string, () => Promise<string>])[] = [
      ['a payload with no second tag separator', async () => withoutSecondColon(mintLedger9ContractStateHex())],
      ['an unknown namespace and version', async () => retagged(mintLedger9ContractStateHex(), 'attacker:v1')],
      [
        'a real tag naming a different serialized type',
        async () => retagged(mintLedger9ContractStateHex(), 'midnight:zswap-ledger-state[v5]')
      ],
      ['a tag prefix longer than the scan window', async () => retagged(mintLedger9ContractStateHex(), `${'x'.repeat(70)}:v8`)]
    ];

    test.each(rejections)('rejects %s on its tag, with the shared tag-parse code', async (_name, buildStateHex) => {
      const provider = providerServing(await buildStateHex(), LEDGER9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).not.toBeInstanceOf(DeserializationError);
      expect(hasErrorCode(rejection, UTILS_ERROR_CODES.TAG_PARSE_FAILED)).toBe(true);
    });

    test('rejects a hex state followed by junk, rather than serving the hex prefix', async () => {
      const provider = providerServing(`${mintLedger9ContractStateHex()}zz`, LEDGER9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-state-encoding' });
    });

    test('rejects a state that is not hex-encoded at all, before it can be silently truncated', async () => {
      // `Buffer.from(s, 'hex')` stops at the first unreadable character, so
      // without an up-front check a partly-hex payload would become a shorter
      // byte string that could still carry a valid-looking version tag.
      const provider = providerServing('not-hex-at-all', LEDGER9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-state-encoding' });
    });

    test('never echoes the served payload back in the error message', async () => {
      const stateHex = retagged(mintLedger9ContractStateHex(), 'attacker:v1');
      const provider = providerServing(stateHex, LEDGER9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect((rejection as Error).message).not.toContain('attacker');
      expect((rejection as Error).message).not.toContain(stateHex.slice(0, 16));
    });
  });
});
