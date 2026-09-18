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

import type { Module, ModuleThunk } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { describe, expect, it, vi } from 'vitest';

import { bundledContractModuleProvider } from '../bundled-contract-module-provider';

const ADDRESS = `0200${'a1'.repeat(30)}`;
const OTHER_ADDRESS = `0200${'b2'.repeat(30)}`;

/** A thunk for a module the tests never look inside; only its identity is asserted on. */
const thunkFor = (tag: string): ModuleThunk => {
  const module = { tag } as unknown as Module;
  return () => Promise.resolve(module);
};

describe('bundledContractModuleProvider', () => {
  it('resolves a registered address to the thunk in that entry', () => {
    const dex = thunkFor('dex');
    const provider = bundledContractModuleProvider(new Map([[ADDRESS, dex]]));

    expect(provider.resolve(ADDRESS)).toBe(dex);
  });

  it('resolves an address the table does not hold to undefined', () => {
    const provider = bundledContractModuleProvider(new Map([[ADDRESS, thunkFor('dex')]]));

    // Absence is a value, not a throw: the runtime turns it into an unsupported implementation.
    expect(provider.resolve(OTHER_ADDRESS)).toBeUndefined();
  });

  it('resolves nothing from an empty table', () => {
    expect(bundledContractModuleProvider(new Map()).resolve(ADDRESS)).toBeUndefined();
  });

  it('matches case-insensitively in both directions', () => {
    const upper = thunkFor('upper');
    const lower = thunkFor('lower');
    const fromUpperTable = bundledContractModuleProvider(new Map([[ADDRESS.toUpperCase(), upper]]));
    const fromLowerTable = bundledContractModuleProvider(new Map([[ADDRESS.toLowerCase(), lower]]));

    expect(fromUpperTable.resolve(ADDRESS.toLowerCase())).toBe(upper);
    expect(fromLowerTable.resolve(ADDRESS.toUpperCase())).toBe(lower);
  });

  it('does not load the module it resolves', () => {
    const load = vi.fn<ModuleThunk>(() => Promise.resolve({} as Module));
    const provider = bundledContractModuleProvider(new Map([[ADDRESS, load]]));

    provider.resolve(ADDRESS);

    // Loading is the thunk's job, and the caller decides when. A provider that imported here would
    // pay for every implementation in the table on the first call.
    expect(load).not.toHaveBeenCalled();
  });

  it('is a snapshot of the table it was given', () => {
    const modules = new Map([[ADDRESS, thunkFor('dex')]]);
    const provider = bundledContractModuleProvider(modules);

    modules.set(OTHER_ADDRESS, thunkFor('token'));

    // The table is generated at build time; reading it once is what makes the checks below happen
    // at wiring rather than at the call.
    expect(provider.resolve(OTHER_ADDRESS)).toBeUndefined();
  });

  it('rejects two keys that differ only in case and name different modules', () => {
    const modules = new Map([
      [ADDRESS.toLowerCase(), thunkFor('v1')],
      [ADDRESS.toUpperCase(), thunkFor('v2')]
    ]);

    expect(() => bundledContractModuleProvider(modules)).toThrow(ADDRESS.toLowerCase());
  });

  it('accepts two keys that differ only in case and name the same module', () => {
    const dex = thunkFor('dex');
    const provider = bundledContractModuleProvider(
      new Map([
        [ADDRESS.toLowerCase(), dex],
        [ADDRESS.toUpperCase(), dex]
      ])
    );

    expect(provider.resolve(ADDRESS)).toBe(dex);
  });

  it('rejects a key that is not a contract address, naming it', () => {
    const notAnAddress = 'dex';

    // The underlying assertion reports the shape that was wrong; which entry carried it is what a
    // generated table needs, so the key is named here.
    expect(() => bundledContractModuleProvider(new Map([[notAnAddress, thunkFor('dex')]]))).toThrow(
      /not a contract address: 'dex'/
    );
  });

  it('rejects a key of the wrong length even though it is hex', () => {
    expect(() => bundledContractModuleProvider(new Map([['ab'.repeat(16), thunkFor('dex')]]))).toThrow(TypeError);
  });
});
