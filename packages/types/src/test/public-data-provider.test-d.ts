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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { Observable } from 'rxjs';
import { describe, expectTypeOf, it } from 'vitest';

import type { UnshieldedBalances } from '../midnight-types';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  PositionedRecord,
  PublicDataProvider
} from '../public-data-provider';
import type { RawContractState } from '../raw-contract-state';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` case, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package, enabled unconditionally in
// `vitest.config.ts`, which surfaces `tsc` diagnostics against this file as
// test failures; a plain `yarn test` runs them. Running these bodies at
// runtime is incidental — `expectTypeOf(...)` performs no runtime assertion.

// Spelled out independently of `RawContractState` (no `Omit`/`keyof` derived
// from it, and the ledger-version domain restated as a literal union rather
// than imported) so the equality check below actually pins the record's shape
// instead of reflexively restating it.
type RawContractStateFixture = {
  readonly version: 'v8' | 'v9';
  readonly protocolVersion: number;
  readonly raw: Uint8Array;
  // OPTIONAL, and the optionality is the load-bearing part: a provider that
  // cannot serve the block's ledger parameters is still a usable provider, so
  // this may not become required without breaking every existing implementation.
  // Bytes rather than a decoded object for the same reason `raw` is bytes —
  // they are era-tagged, and this record is era-agnostic.
  readonly ledgerParameters?: Uint8Array;
};

type PositionedRecordFixture<T> = {
  readonly value: T;
  readonly blockHeight: number;
  readonly blockHash: string;
};

// Independent restatements of the three new member signatures — written out
// here rather than read off the interface, so a widened parameter, a dropped
// optional, or a changed result type breaks the equality checks below.
type HeadVersionQuery = () => Promise<number>;

type RawStateQuery = (
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
) => Promise<RawContractState | null>;

// `config` is REQUIRED here, matching the two observables that came before it
// — an implementation may default it, the interface does not.
type RawStateStream = (
  address: ContractAddress,
  config: ContractStateObservableConfig
) => Observable<PositionedRecordFixture<RawContractState>>;

// Today's interface minus ONE named member.
//
// One suppression per member, never one covering all three. `Omit` strips a key
// whether it is required or optional, so a single `Omit` of all three names
// keeps erroring — and keeps its `@ts-expect-error` used — while any two of
// them are still missing. Such a test only detects all three being relaxed at
// once, which is the case that will never happen. Verified with this repo's
// own `tsc`, not assumed.
type Without<K extends keyof PublicDataProvider> = Omit<PublicDataProvider, K>;

describe('PublicDataProvider head-version and raw-state members', () => {
  // Each assertion below is carried by the suppression, not by the body: the
  // moment that ONE member stops being required, its `Omit` result becomes
  // assignable, the suppression goes unused, and TypeScript reports *that*.
  it('rejects an implementation missing queryLatestProtocolVersion', () => {
    // @ts-expect-error `queryLatestProtocolVersion` is a required member.
    const provider: PublicDataProvider = {} as Without<'queryLatestProtocolVersion'>;

    expectTypeOf(provider).not.toBeAny();
  });

  it('rejects an implementation missing queryRawContractState', () => {
    // @ts-expect-error `queryRawContractState` is a required member.
    const provider: PublicDataProvider = {} as Without<'queryRawContractState'>;

    expectTypeOf(provider).not.toBeAny();
  });

  it('rejects an implementation missing rawContractStateObservable', () => {
    // @ts-expect-error `rawContractStateObservable` is a required member.
    const provider: PublicDataProvider = {} as Without<'rawContractStateObservable'>;

    expectTypeOf(provider).not.toBeAny();
  });

  it('accepts the previous member set once all three new members are supplied — no fourth member is required', () => {
    // Positive control for the three checks above: proves the rejections are
    // caused by exactly these three members and nothing else. It also fails if
    // a *further* member is added to the interface without this test being
    // updated.
    expectTypeOf<
      Without<'queryLatestProtocolVersion' | 'queryRawContractState' | 'rawContractStateObservable'> & {
        queryLatestProtocolVersion: HeadVersionQuery;
        queryRawContractState: RawStateQuery;
        rawContractStateObservable: RawStateStream;
      }
    >().toMatchTypeOf<PublicDataProvider>();
  });

  it('pins queryLatestProtocolVersion to a no-argument query resolving to a version integer', () => {
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toEqualTypeOf<HeadVersionQuery>();
  });

  it('takes no options bag, so no caller can ask for a cached answer', () => {
    // Type-level call checks only — `toBeCallableWith` never invokes anything
    // at runtime, so these stay safe against the `{} as PublicDataProvider`
    // stubs used elsewhere in this file.
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith();
    // @ts-expect-error The member reads the network on every call, so there is
    // no freshness option to pass. If an options parameter were reintroduced,
    // this suppression would become unused and TypeScript would report *that*.
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith({ fresh: true });
  });

  it('pins queryRawContractState to an address plus an optional block config, resolving to the record or null', () => {
    expectTypeOf<PublicDataProvider['queryRawContractState']>().toEqualTypeOf<RawStateQuery>();
  });

  it('pins rawContractStateObservable to an address plus a stream config, emitting the raw record', () => {
    expectTypeOf<PublicDataProvider['rawContractStateObservable']>().toEqualTypeOf<RawStateStream>();
  });

  it('streams the same record the raw query resolves to, so one narrowing serves both', () => {
    // The two raw reads are a pair: a caller writes ONE `switch (record.version)`
    // and uses it against the query and the stream alike. Compared against the
    // QUERY's element rather than against `RawContractState` restated here —
    // restating it would pass even if the query were retyped to resolve a
    // different record, which is the divergence this is for.
    type Streamed = PublicDataProvider['rawContractStateObservable'] extends (
      ...args: never[]
    ) => Observable<PositionedRecord<infer Element>>
      ? Element
      : never;
    type Queried = NonNullable<Awaited<ReturnType<PublicDataProvider['queryRawContractState']>>>;

    expectTypeOf<Streamed>().toEqualTypeOf<Queried>();
  });

  it('pins RawContractState to exactly four fields — fails if one is dropped, added, or retyped', () => {
    // Bidirectional: catches a field being dropped (the fixture would then
    // demand a field `RawContractState` no longer has), added
    // (`RawContractState` would demand a field the fixture doesn't have), or
    // retyped (a mismatched field type breaks assignability in at least one
    // direction).
    expectTypeOf<RawContractStateFixture>().toEqualTypeOf<RawContractState>();
  });

  it('keeps the raw bytes untyped by era — narrowing goes through the version discriminant, not the byte array', () => {
    const record = {} as RawContractState;

    expectTypeOf(record.raw).toEqualTypeOf<Uint8Array>();
    expectTypeOf(record.version).toEqualTypeOf<'v8' | 'v9'>();
  });
});

describe('PositionedRecord', () => {
  it('pins PositionedRecord to exactly value, blockHeight and blockHash', () => {
    expectTypeOf<PositionedRecord<RawContractState>>().toEqualTypeOf<PositionedRecordFixture<RawContractState>>();
  });

  it('types its position like the block configs, so a record resumes a stream unchanged', () => {
    expectTypeOf<PositionedRecord<RawContractState>['blockHeight']>().toEqualTypeOf<BlockHeightConfig['blockHeight']>();
    expectTypeOf<PositionedRecord<RawContractState>['blockHash']>().toEqualTypeOf<BlockHashConfig['blockHash']>();
  });
});

describe('positioned stream members', () => {
  it('pins contractStateObservable to positioned decoded states', () => {
    expectTypeOf<PublicDataProvider['contractStateObservable']>().toEqualTypeOf<
      (address: ContractAddress, config: ContractStateObservableConfig) => Observable<PositionedRecordFixture<ContractState>>
    >();
  });

  it('pins unshieldedBalancesObservable to positioned balances', () => {
    expectTypeOf<PublicDataProvider['unshieldedBalancesObservable']>().toEqualTypeOf<
      (address: ContractAddress, config: ContractStateObservableConfig) => Observable<PositionedRecordFixture<UnshieldedBalances>>
    >();
  });
});
