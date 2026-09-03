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
import { describe, expectTypeOf, it } from 'vitest';

import type { BlockHashConfig, BlockHeightConfig, PublicDataProvider } from '../public-data-provider';
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
};

// Independent restatements of the two new member signatures — written out
// here rather than read off the interface, so a widened parameter, a dropped
// optional, or a changed result type breaks the equality checks below.
type HeadVersionQuery = (options?: { readonly fresh?: boolean }) => Promise<number>;

type RawStateQuery = (
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
) => Promise<RawContractState | null>;

// The member set an implementation written against the previous release
// satisfies: today's interface minus the two members this change adds.
// Deliberately derived with `Omit` — the property under test is "these two
// names are required members", and deriving makes the test fail (via an
// unused `@ts-expect-error`) the moment either name stops being required.
type PreviousPublicDataProvider = Omit<
  PublicDataProvider,
  'queryLatestProtocolVersion' | 'queryRawContractState'
>;

describe('PublicDataProvider head-version and raw-state members', () => {
  it('rejects an implementation that supplies only the previous member set', () => {
    const previousImplementation = {} as PreviousPublicDataProvider;

    // @ts-expect-error An object that implements every member of the previous
    // release no longer satisfies `PublicDataProvider`: both
    // `queryLatestProtocolVersion` and `queryRawContractState` are missing.
    // If either member stopped being required, this suppression would become
    // unused and TypeScript would report *that* instead — which is what makes
    // this an actual assertion rather than a comment.
    const provider: PublicDataProvider = previousImplementation;

    expectTypeOf(provider).not.toBeAny();
  });

  it('accepts the previous member set once both new members are supplied — no third member is required', () => {
    // Positive control for the check above: proves the rejection is caused by
    // exactly these two members. It also fails if a *further* member is added
    // to the interface without this test being updated.
    expectTypeOf<
      PreviousPublicDataProvider & {
        queryLatestProtocolVersion: HeadVersionQuery;
        queryRawContractState: RawStateQuery;
      }
    >().toMatchTypeOf<PublicDataProvider>();
  });

  it('pins queryLatestProtocolVersion to an optional freshness option resolving to a version integer', () => {
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toEqualTypeOf<HeadVersionQuery>();
  });

  it('keeps queryLatestProtocolVersion callable with no argument and with the freshness option', () => {
    // Type-level call checks only — `toBeCallableWith` never invokes anything
    // at runtime, so these stay safe against the `{} as PublicDataProvider`
    // stubs used elsewhere in this file.
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith();
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith({ fresh: true });
  });

  it('pins queryRawContractState to an address plus an optional block config, resolving to the record or null', () => {
    expectTypeOf<PublicDataProvider['queryRawContractState']>().toEqualTypeOf<RawStateQuery>();
  });

  it('pins RawContractState to exactly three fields — fails if one is dropped, added, or retyped', () => {
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
