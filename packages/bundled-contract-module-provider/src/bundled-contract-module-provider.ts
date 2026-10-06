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

import type { ContractModuleProvider, ModuleThunk } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Which module implements the contract deployed at each address. A deployment puts no code on
 * chain, so this table is the only place the association exists, and only the application has it.
 *
 * Each entry is a thunk over a literal `import()` specifier, so a bundler sees every edge, splits
 * the chunk, and fetches an implementation only if a call actually reaches it. Build tooling
 * generates the table; nothing here executes an entry.
 */
export type ModulesByAddress = ReadonlyMap<string, ModuleThunk>;

/** Addresses are hex, so the table and the chain can only differ in case. */
const normalizeAddress = (address: string): string => address.toLowerCase();

/**
 * Resolves a cross-contract callee to one of the modules bundled with this application, listed in a
 * {@link ModulesByAddress} table. Addresses are matched case-insensitively.
 *
 * The table is read once, here, so the provider is a snapshot: an entry added to the source map
 * afterwards is not resolved. Every key is checked to be a contract address at that point too,
 * because a mistyped one is otherwise indistinguishable at the call from an address with no
 * implementation deployed at it.
 *
 * @param modules The address-to-module table.
 * @returns A provider resolving an address to its thunk, or `undefined` when the table holds no
 * entry for it — which the runtime reports as an unsupported implementation.
 * @throws TypeError If a key is not a contract address.
 * @throws Error If two keys differ only in case and name different modules, since one of them would
 * otherwise be dropped silently.
 */
export const bundledContractModuleProvider = (modules: ModulesByAddress): ContractModuleProvider => {
  const byAddress = new Map<string, ModuleThunk>();
  for (const [address, module] of modules) {
    try {
      assertIsContractAddress(address);
    } catch (cause) {
      // Re-thrown to name the key: the underlying message reports the shape that was wrong, not
      // which of a generated table's entries carried it.
      throw new TypeError(`Contract module table has a key that is not a contract address: '${address}'`, { cause });
    }
    const key = normalizeAddress(address);
    const collision = byAddress.get(key);
    if (collision !== undefined && collision !== module) {
      throw new Error(`Two modules are registered for contract address '${key}', differing only in case`);
    }
    byAddress.set(key, module);
  }
  return { resolve: (address) => byAddress.get(normalizeAddress(address)) };
};
