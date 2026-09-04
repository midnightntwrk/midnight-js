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

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type PipelineEra, pipelineEraOf } from '../internal/era';
import type { CoinReceiver016Contract, CoinReceiver016Module, Counter016Contract, Counter016Module } from './ledger8-fixture-types';

// The retained-era half of `pipelineEraOf`'s coverage, and the reason it is a FILE of its own
// rather than a `describe` inside `era-dispatch.test.ts`: the real `compact-runtime@0.16`
// artifacts need a module-scoped runtime stub (their generated code opens with
// `checkRuntimeVersion('0.16.0')`, which the installed current runtime rejects outright), while
// the current-era artifact `era-dispatch.test.ts` loads needs the REAL runtime. One module
// registry cannot serve both, so the two halves are split and each runs against a real artifact.
//
// `ledger8-contract.test.ts` asserts the STRUCTURE these artifacts have. This file asserts that
// `pipelineEraOf` reads that structure correctly -- the two are separate claims, and the second is
// the one the era dispatch depends on.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');
const COUNTER_016_MODULE = resolve(FIXTURES_DIR, 'counter-016/compiled/contract/index.js');
const COIN_RECEIVER_016_MODULE = resolve(FIXTURES_DIR, 'coin-receiver-016/compiled/contract/index.js');

// The same stub `ledger8-contract.test.ts` installs, and for the same reason: nothing here
// EXECUTES a circuit or a constructor, it only inspects the members the generated class installs.
// An insufficient stub cannot pass silently -- the module's top-level code would throw during
// import and this suite would fail loudly.
vi.mock('@midnight-ntwrk/compact-runtime', () => {
  class CompactTypeStub {
    alignment(): unknown[] {
      return [];
    }
    fromValue(value: unknown): unknown {
      return value;
    }
    toValue(value: unknown): unknown[] {
      return [value];
    }
  }
  class ContractStateStub {
    data: unknown = undefined;
  }
  class QueryContextStub {}
  return {
    checkRuntimeVersion: (): void => undefined,
    CompactError: Error,
    CompactTypeBoolean: new CompactTypeStub(),
    CompactTypeBytes: CompactTypeStub,
    CompactTypeUnsignedInteger: CompactTypeStub,
    ContractState: ContractStateStub,
    dummyContractAddress: (): string => '00'.repeat(32),
    QueryContext: QueryContextStub
  };
});

describe('pipelineEraOf against the REAL retained-era artifacts', () => {
  let counter: Counter016Contract;
  let coinReceiver: CoinReceiver016Contract;

  beforeAll(async () => {
    const counterModule: Counter016Module = await import(/* @vite-ignore */ COUNTER_016_MODULE);
    const coinReceiverModule: CoinReceiver016Module = await import(/* @vite-ignore */ COIN_RECEIVER_016_MODULE);
    counter = new counterModule.Contract({});
    coinReceiver = new coinReceiverModule.Contract({});
  });

  it('routes the real zero-argument retained artifact to the retained-era pipeline', () => {
    // The discriminator, restated as an assertion so a toolchain change that made the retained
    // codegen async would fail HERE, naming the cause, rather than in the routing below.
    expect(counter.initialState.constructor.name).toBe('Function');

    expect(pipelineEraOf(counter)).toBe<PipelineEra>('ledger8');
  });

  it('routes the real argument-taking retained artifact the same way', () => {
    expect(coinReceiver.initialState.constructor.name).toBe('Function');

    expect(pipelineEraOf(coinReceiver)).toBe<PipelineEra>('ledger8');
  });

  it('places the real artifact without consulting the compact-js brand, which it does not carry', () => {
    // The retained artifact has no brand either, so the brand cannot distinguish the two eras in
    // EITHER direction -- see the pin in `era-dispatch.test.ts` for the current-era half.
    expect(Symbol.for('compact-js/CompiledContract') in counter).toBe(false);
    expect('tag' in counter).toBe(false);
  });
});
