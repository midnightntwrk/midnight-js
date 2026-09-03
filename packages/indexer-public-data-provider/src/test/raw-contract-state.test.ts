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

import { ledger, loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  DeserializationError,
  fromHex,
  hasErrorCode,
  parseSerializedTag,
  toHex,
  UTILS_ERROR_CODES
} from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, test, vi } from 'vitest';

import { contractStateEnvelopeVersion } from '../codec';
import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { HEAD_PROTOCOL_VERSION_QUERY, RAW_CONTRACT_STATE_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  mintV8ContractStateHex,
  mintV9ContractStateHex,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

const buildProvider = (query: QueryMock): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ query }), 1000);

const composedResponse = (state: string | null, protocolVersion: number | null): unknown => ({
  data: {
    block: protocolVersion === null ? null : { protocolVersion },
    contract: state === null ? null : { state }
  }
});

const providerServing = (state: string | null, protocolVersion: number | null): IndexerPublicDataProvider =>
  buildProvider(vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue(composedResponse(state, protocolVersion)));

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

describe('contract-state envelope tags', () => {
  // Pins the tag-to-era table against what the runtimes actually write. A
  // runtime bump that changes the state format version fails here, loudly,
  // instead of turning every state read into a rejected envelope.
  test('maps the tag the v9 runtime writes onto the v9 ledger era', () => {
    expect(contractStateEnvelopeVersion(new Uint8Array(fromHex(mintV9ContractStateHex())))).toBe('v9');
  });

  test('maps the tag the v8 runtime writes onto the v8 ledger era', async () => {
    expect(contractStateEnvelopeVersion(new Uint8Array(fromHex(await mintV8ContractStateHex())))).toBe('v8');
  });
});

describe('queryRawContractState', () => {
  describe('composed call path', () => {
    test('asks for the block protocol version and the contract state in one request', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION));

      await buildProvider(query).queryRawContractState(ADDRESS);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: RAW_CONTRACT_STATE_QUERY,
          variables: { address: ADDRESS, offset: null },
          fetchPolicy: 'no-cache'
        })
      );
    });

    test('anchors both fields to the same requested offset', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION));

      await buildProvider(query).queryRawContractState(ADDRESS, { type: 'blockHash', blockHash: '0xfeed' });

      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { address: ADDRESS, offset: { hash: '0xfeed' } } })
      );
    });

    test('feeds the head-version cache when the composed response reports the newer era on both fields', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION));
      const provider = buildProvider(query);

      await provider.queryRawContractState(ADDRESS);
      const cached = await provider.queryLatestProtocolVersion();

      expect(cached).toBe(V9_ERA_PROTOCOL_VERSION);
      expect(
        query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY)
      ).toHaveLength(0);
    });

    test('does not feed the cache from a read pinned to an explicit block, which is not the head', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION));
      const provider = buildProvider(query);

      await provider.queryRawContractState(ADDRESS, { type: 'blockHeight', blockHeight: 5 });
      await provider.queryLatestProtocolVersion();

      expect(
        query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY)
      ).toHaveLength(1);
    });

    test('returns null when the contract has no state at the offset', async () => {
      expect(await providerServing(null, V9_ERA_PROTOCOL_VERSION).queryRawContractState(ADDRESS)).toBeNull();
    });

    test('fails fast when a state is served but the block that dates it is missing', async () => {
      // Returning null here would report "no contract at this address" for
      // what is really an inconsistent indexer — two very different things for
      // a caller to act on.
      const rejection = await providerServing(mintV9ContractStateHex(), null)
        .queryRawContractState(ADDRESS)
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'undated-state' });
    });

    test('returns null, without reading a block, when neither the state nor the block is there', async () => {
      expect(await providerServing(null, null).queryRawContractState(ADDRESS)).toBeNull();
    });
  });

  describe('both envelopes round-trip', () => {
    test('serves v9 state bytes that deserialize again with the v9 runtime', async () => {
      const stateHex = mintV9ContractStateHex();

      const record = await providerServing(stateHex, V9_ERA_PROTOCOL_VERSION).queryRawContractState(ADDRESS);

      expect(record?.version).toBe('v9');
      expect(record?.protocolVersion).toBe(V9_ERA_PROTOCOL_VERSION);
      expect(ledger.ContractState.deserialize(record?.raw ?? new Uint8Array()).serialize()).toEqual(
        new Uint8Array(fromHex(stateHex))
      );
    });

    test('serves v8 state bytes that deserialize again with the v8 runtime', async () => {
      const stateHex = await mintV8ContractStateHex();
      const v8 = await loadLedger8();

      const record = await providerServing(stateHex, V8_ERA_PROTOCOL_VERSION).queryRawContractState(ADDRESS);

      expect(record?.version).toBe('v8');
      expect(record?.protocolVersion).toBe(V8_ERA_PROTOCOL_VERSION);
      expect(v8.ContractState.deserialize(record?.raw ?? new Uint8Array()).serialize()).toEqual(
        new Uint8Array(fromHex(stateHex))
      );
    });

    test('derives the era only from the protocol version, never from the envelope tag', async () => {
      // A v8-era protocol version paired with a v9 envelope: `version` still
      // follows the protocol version, because that is the single construction
      // point. Catching the disagreement is the era cross-check's job, not
      // this record's.
      const record = await providerServing(mintV9ContractStateHex(), V8_ERA_PROTOCOL_VERSION).queryRawContractState(
        ADDRESS
      );

      expect(record?.version).toBe('v8');
    });
  });

  describe('adversarial envelopes', () => {
    const rejections: readonly (readonly [string, () => Promise<string>])[] = [
      ['a payload with no second tag separator', async () => withoutSecondColon(mintV9ContractStateHex())],
      ['an unknown namespace and version', async () => retagged(mintV9ContractStateHex(), 'attacker:v1')],
      [
        'a real tag naming a different serialized type',
        async () => retagged(mintV9ContractStateHex(), 'midnight:zswap-ledger-state[v5]')
      ],
      ['a tag prefix longer than the scan window', async () => retagged(mintV9ContractStateHex(), `${'x'.repeat(70)}:v8`)]
    ];

    test.each(rejections)('rejects %s', async (_name, buildStateHex) => {
      const provider = providerServing(await buildStateHex(), V9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryRawContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      // Rejected on the envelope, before anything reached a deserializer — a
      // `DeserializationError` here would mean the bytes got that far.
      expect(rejection).not.toBeInstanceOf(DeserializationError);
      expect(rejection).toBeInstanceOf(Error);
    });

    test.each(rejections)('reports %s with the shared tag-parse code', async (_name, buildStateHex) => {
      const provider = providerServing(await buildStateHex(), V9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryRawContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(hasErrorCode(rejection, UTILS_ERROR_CODES.TAG_PARSE_FAILED)).toBe(true);
    });

    test('rejects a state that is not hex-encoded at all, before it can be silently truncated', async () => {
      // `Buffer.from(s, 'hex')` stops at the first unreadable character, so
      // without an up-front check a partly-hex payload would become a shorter
      // byte string that could still carry a valid-looking envelope.
      const provider = providerServing('not-hex-at-all', V9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryRawContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(IndexerDataError);
      expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-state-encoding' });
    });

    test('never echoes the served payload back in the error message', async () => {
      const stateHex = retagged(mintV9ContractStateHex(), 'attacker:v1');
      const provider = providerServing(stateHex, V9_ERA_PROTOCOL_VERSION);

      const rejection = await provider.queryRawContractState(ADDRESS).then(
        () => undefined,
        (error: unknown) => error
      );

      expect((rejection as Error).message).not.toContain('attacker');
      expect((rejection as Error).message).not.toContain(stateHex.slice(0, 16));
    });

    test('does not feed the head-version cache from a rejected payload', async () => {
      const query = vi
        .fn<(request: ApolloRequest) => Promise<unknown>>()
        .mockResolvedValue(composedResponse(retagged(mintV9ContractStateHex(), 'attacker:v1'), V9_ERA_PROTOCOL_VERSION));
      const provider = buildProvider(query);

      await provider.queryRawContractState(ADDRESS).catch(() => undefined);
      await provider.queryLatestProtocolVersion().catch(() => undefined);

      expect(
        query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY)
      ).toHaveLength(1);
    });
  });
});
