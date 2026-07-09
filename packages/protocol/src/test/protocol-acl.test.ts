/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import * as compactJs from '../compact-js';
import * as compactJsEffect from '../compact-js-effect';
import * as compactJsEffectContract from '../compact-js-effect-contract';
import * as compactRuntime from '../compact-runtime';
import * as protocol from '../index';
import * as ledger from '../ledger';
import * as onchainRuntime from '../onchain-runtime';
import * as platform from '../platform';
import * as platformEffectConfiguration from '../platform-effect-configuration';
import * as platformEffectContractAddress from '../platform-effect-contract-address';

// Pairings of a subpath module and the matching top-level namespace. The two
// must expose identical member sets — otherwise consumers see different
// surfaces depending on import style and tree-shaking breaks.
type ModuleRecord = Readonly<Record<string, unknown>>;
const subpathNamespacePairs: readonly [name: string, subpath: ModuleRecord, namespace: ModuleRecord][] = [
  ['ledger', ledger, protocol.ledger],
  ['compact-runtime', compactRuntime, protocol.compactRuntime],
  ['compact-js', compactJs, protocol.compactJs],
  ['onchain-runtime', onchainRuntime, protocol.onchainRuntime],
  ['platform-js', platform, protocol.platform],
];

const expectCallable = (value: unknown): void => {
  expect(typeof value).toBe('function');
};

// Use `localeCompare` to sort alphabetically in a locale-aware way rather than
// relying on the default code-unit ordering of `Array.prototype.sort`.
const sortedKeys = (m: object): string[] => Object.keys(m).sort((a, b) => a.localeCompare(b));

describe('Protocol ACL package', () => {
  describe('barrel namespace exports', () => {
    it.each([
      ['ledger', protocol.ledger],
      ['compactRuntime', protocol.compactRuntime],
      ['compactJs', protocol.compactJs],
      ['onchainRuntime', protocol.onchainRuntime],
      ['platform', protocol.platform],
    ])('exposes the %s namespace as a non-empty object', (_name, ns) => {
      expect(ns).toBeDefined();
      expect(typeof ns).toBe('object');
      expect(Object.keys(ns).length).toBeGreaterThan(0);
    });

    it('exposes exactly the documented namespaces', () => {
      // If this fails after adding a new protocol namespace, update the expected list.
      expect(sortedKeys(protocol)).toEqual([
        'compactJs',
        'compactRuntime',
        'ledger',
        'onchainRuntime',
        'platform',
      ]);
    });
  });

  describe('subpath / namespace parity', () => {
    it.each(subpathNamespacePairs)(
      '%s subpath has identical members to the barrel namespace',
      (_name, subpath, namespace) => {
        expect(sortedKeys(subpath)).toEqual(sortedKeys(namespace));
      }
    );
  });

  describe('representative symbols resolve via subpath', () => {
    // Asserting well-known public symbols from each upstream package confirms
    // the subpath wires through to real content, not an empty/stub module.
    it('ledger subpath re-exports representative sample-* functions', () => {
      expectCallable(ledger.sampleSigningKey);
      expectCallable(ledger.sampleContractAddress);
      expectCallable(ledger.sampleRawTokenType);
    });

    it('compact-runtime subpath re-exports representative state values', () => {
      expect(compactRuntime.StateValue).toBeDefined();
      expect(compactRuntime.ChargedState).toBeDefined();
    });

    it('onchain-runtime subpath re-exports sampleSigningKey and entryPointHash', () => {
      expectCallable(onchainRuntime.sampleSigningKey);
      expectCallable(onchainRuntime.entryPointHash);
    });

    it('platform-js subpath re-exports effect namespaces', () => {
      expect(platform.Configuration).toBeDefined();
      expect(platform.ContractAddress).toBeDefined();
    });
  });

  describe('effect submodule subpaths', () => {
    // These submodule subpaths are not reachable through the index namespace,
    // so only structural resolution is asserted.
    it('compact-js/effect subpath resolves and exposes CompiledContract and Contract namespaces', () => {
      expect(compactJsEffect).toBeDefined();
      expect(compactJsEffect.CompiledContract).toBeDefined();
      expect(compactJsEffect.Contract).toBeDefined();
      expect(Object.keys(compactJsEffect).length).toBeGreaterThan(0);
    });

    it('compact-js/effect/Contract subpath resolves to a non-empty module', () => {
      expect(compactJsEffectContract).toBeDefined();
      expect(Object.keys(compactJsEffectContract).length).toBeGreaterThan(0);
    });

    it('platform-js/effect/Configuration subpath re-exports the Keys and Network service tags', () => {
      expect(platformEffectConfiguration).toBeDefined();
      expect(platformEffectConfiguration.Keys).toBeDefined();
      expect(platformEffectConfiguration.Network).toBeDefined();
    });

    it('platform-js/effect/ContractAddress subpath re-exports the ContractAddress brand', () => {
      expect(platformEffectContractAddress).toBeDefined();
      expect(platformEffectContractAddress.ContractAddress).toBeDefined();
      expectCallable(platformEffectContractAddress.asBytes);
    });
  });
});
