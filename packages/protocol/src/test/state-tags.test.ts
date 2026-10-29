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

import { describe, expect, it } from 'vitest';

import { loadLedger8Protocol } from '../lib/v8/load';
import * as ledger9 from '../v9';
import * as compactRuntime from '../v9-compact-runtime';
import { LEDGER_STATE_KINDS, LEDGER_STATE_TAGS, LEDGER_VERSIONS, type LedgerStateKind, type LedgerVersion } from '../version';

type Serializable = { serialize(): Uint8Array };
type Runtime = {
  readonly ContractState: new () => Serializable;
  readonly LedgerParameters: { initialParameters(): Serializable };
  readonly ZswapChainState: new () => Serializable;
};

const mint: Readonly<Record<LedgerStateKind, (runtime: Runtime) => Serializable>> = {
  ContractState: (runtime) => new runtime.ContractState(),
  LedgerParameters: (runtime) => runtime.LedgerParameters.initialParameters(),
  ZswapChainState: (runtime) => new runtime.ZswapChainState()
};

const runtimeOf = async (era: LedgerVersion): Promise<Runtime> => (era === 'v9' ? ledger9 : loadLedger8Protocol());

const leadingTag = (bytes: Uint8Array, tag: string): string =>
  new TextDecoder().decode(bytes.subarray(0, tag.length + 1));

describe('LEDGER_STATE_TAGS', () => {
  it('lists every state kind', () => {
    expect(Object.keys(LEDGER_STATE_TAGS).sort()).toEqual([...LEDGER_STATE_KINDS].sort());
  });

  it.each(LEDGER_STATE_KINDS.flatMap((kind) => LEDGER_VERSIONS.map((era) => [kind, era] as const)))(
    'holds the tag the %s runtime of %s writes',
    async (kind, era) => {
      const bytes = mint[kind](await runtimeOf(era)).serialize();

      expect(leadingTag(bytes, LEDGER_STATE_TAGS[kind][era])).toBe(`${LEDGER_STATE_TAGS[kind][era]}:`);
    }
  );

  it.each([
    ['v9', async () => compactRuntime.ContractState],
    ['v8', async () => (await import('compact-runtime-ledger8')).ContractState]
  ] as const)('holds the tag the compact-runtime ContractState of %s writes, the class dApps decode with', async (era, load) => {
    const ContractState = await load();
    const bytes = new ContractState().serialize();

    expect(leadingTag(bytes, LEDGER_STATE_TAGS.ContractState[era])).toBe(`${LEDGER_STATE_TAGS.ContractState[era]}:`);
  });

  it('tells the eras apart by tag for a contract state and for ledger parameters', () => {
    expect(LEDGER_STATE_TAGS.ContractState.v8).not.toBe(LEDGER_STATE_TAGS.ContractState.v9);
    expect(LEDGER_STATE_TAGS.LedgerParameters.v8).not.toBe(LEDGER_STATE_TAGS.LedgerParameters.v9);
  });

  it('gives a zswap chain state the same tag in v8 and v9, because both runtimes write the same format', () => {
    expect(LEDGER_STATE_TAGS.ZswapChainState.v8).toBe(LEDGER_STATE_TAGS.ZswapChainState.v9);
  });

  it('is frozen at every level', () => {
    expect(Object.isFrozen(LEDGER_STATE_TAGS)).toBe(true);
    expect(LEDGER_STATE_KINDS.every((kind) => Object.isFrozen(LEDGER_STATE_TAGS[kind]))).toBe(true);
    expect(Object.isFrozen(LEDGER_STATE_KINDS)).toBe(true);
  });
});
