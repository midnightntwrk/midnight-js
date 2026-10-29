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

import * as protocol from '../index';
import * as platform from '../platform';
import * as platformEffectConfiguration from '../platform-effect-configuration';
import * as platformEffectContractAddress from '../platform-effect-contract-address';
import * as ledger from '../v9';
import * as compactJsEffect from '../v9-compact-js-effect';
import * as compactJsEffectContract from '../v9-compact-js-effect-contract';
import * as compactRuntime from '../v9-compact-runtime';
import * as onchainRuntime from '../v9-onchain-runtime';

const expectCallable = (value: unknown): void => {
  expect(typeof value).toBe('function');
};

// Use `localeCompare` to sort alphabetically in a locale-aware way rather than
// relying on the default code-unit ordering of `Array.prototype.sort`.
const sortedKeys = (m: object): string[] => Object.keys(m).sort((a, b) => a.localeCompare(b));

describe('Protocol ACL package', () => {
  describe('barrel namespace exports', () => {
    it('exposes the platform namespace with the same members as the platform-js subpath', () => {
      expect(sortedKeys(protocol.platform)).toEqual(sortedKeys(platform));
    });

    it('exposes exactly the full barrel export surface, including ./errors, ./version and lib/v8/load', () => {
      // Strict sorted-key equality over the whole barrel: the platform
      // namespace plus every value exported from ./errors,
      // ./version, lib/era/load-era and lib/v8/load. If this fails after adding/removing a
      // protocol export, update the expected list. `Ledger8Protocol` is a
      // type-only export and does not appear here (types have no runtime key).
      expect(sortedKeys(protocol)).toEqual([
        'COMMON_ERROR_CATEGORIES',
        'COMMON_ERROR_CODES',
        'ComposeFailedError',
        'ComposeOptionError',
        'ConfigurationError',
        'ContractExecutionError',
        'CURRENT_LEDGER_VERSION',
        'EnvironmentUnsupportedError',
        'findCodedCause',
        'INITIAL_LEDGER_PARAMETERS',
        'InvalidArgumentError',
        'InvariantViolationError',
        'latestNetworkLedgerVersion',
        'LEDGER_STATE_KINDS',
        'LEDGER_STATE_TAGS',
        'LEDGER_VERSIONS',
        'Ledger8RuntimeInvalidError',
        'Ledger8RuntimeMissingError',
        'loadLedger8Engine',
        'loadLedger8Protocol',
        'loadLedgerEra',
        'MaintenanceAuthorityMismatchError',
        'MIDNIGHT_JS_ERROR_CATEGORIES',
        'MidnightJsError',
        'NO_CIRCUIT',
        'PayloadNotATransactionError',
        'platform',
        'PROTOCOL_ERROR_CATEGORIES',
        'PROTOCOL_ERROR_CODES',
        'protocolVersionToLedger',
        'RETAINED_LEDGER_VERSIONS',
        'StateConversionFailedError',
        'StateDecodeFailedError',
        'StateInconsistentError',
        'TRANSACTION_TAG_PREFIX',
        'UnknownLedgerVersionError',
        'UnknownProtocolVersionError',
        'versionOfRecord',
      ]);
    });
  });

  describe('representative symbols resolve via subpath', () => {
    // Asserting well-known public symbols from each upstream package confirms
    // the subpath wires through to real content, not an empty/stub module.
    it('v9 subpath re-exports representative sample-* functions', () => {
      expectCallable(ledger.sampleSigningKey);
      expectCallable(ledger.sampleContractAddress);
      expectCallable(ledger.sampleRawTokenType);
    });

    it('v9/compact-runtime subpath re-exports representative state values', () => {
      expect(compactRuntime.StateValue).toBeDefined();
      expect(compactRuntime.ChargedState).toBeDefined();
    });

    it('v9/onchain-runtime subpath re-exports sampleSigningKey and entryPointHash', () => {
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
    it('v9/compact-js/effect subpath resolves and exposes CompiledContract and Contract namespaces', () => {
      expect(compactJsEffect).toBeDefined();
      expect(compactJsEffect.CompiledContract).toBeDefined();
      expect(compactJsEffect.Contract).toBeDefined();
      expect(Object.keys(compactJsEffect).length).toBeGreaterThan(0);
    });

    it('v9/compact-js/effect/Contract subpath resolves to a non-empty module', () => {
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
