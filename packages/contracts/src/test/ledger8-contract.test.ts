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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { deployContract } from '../deploy-contract';
import { findDeployedContract } from '../find-deployed-contract';
import { isLedger8Options, LEDGER8_PIPELINE_NOT_WIRED, type Ledger8ContractProviders } from '../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../submit-call-tx';
import type {
  CoinReceiver016Contract,
  CoinReceiver016Module,
  Counter016Contract,
  Counter016Module
} from './ledger8-fixture-types';
import { createMockProviders } from './test-mocks';

// The other half of `../ledger8-contract.ts`. That file hand-writes the retained-era
// (`compact-runtime@0.16`) contract type family, because the retained toolchain emits
// `contract/index.js` with no `index.d.ts` beside it — there is no declaration file to import a
// type from. A hand-written type is a claim about generated code, and this test is what makes the
// claim checkable: it loads the REAL generated artifact, constructs it, and asserts the exact
// structural facts the family encodes.
//
// The pairing is required, not optional. `typecheck/overloads.test-d.ts` proves the entry points'
// overloads DISCRIMINATE the two eras; only this test proves the shape they discriminate on is the
// shape a real retained-era contract actually has. Without it the family is an unverified guess and
// the compile assertions prove nothing about a real contract.

// The shared hard-fork fixture tree, which lives in `testkit-js` because that is where the
// fixtures are produced and where the e2e suites consume them.
//
// Reached by relative path rather than through a package dependency: `testkit-js` depends on
// `midnight-js-contracts`, so declaring it as a dependency here would close a workspace cycle.
// `packages/protocol/src/test/fixtures.ts` reaches the same tree the same way.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');
const COUNTER_016_DIR = resolve(FIXTURES_DIR, 'counter-016/compiled/contract');
const COUNTER_016_MODULE = resolve(COUNTER_016_DIR, 'index.js');
const COIN_RECEIVER_016_DIR = resolve(FIXTURES_DIR, 'coin-receiver-016/compiled/contract');
const COIN_RECEIVER_016_MODULE = resolve(COIN_RECEIVER_016_DIR, 'index.js');
const TWIN_018_MODULE_TYPES = resolve(FIXTURES_DIR, 'twin-contract/compiled/contract/index.d.ts');

// The registered symbol the current era's `CompiledContract` container is branded with. Spelled
// out rather than imported so this test asserts the brand's ABSENCE against the literal key, and
// keeps asserting it if the vendor moves where the constant is exported from.
const COMPILED_CONTRACT_BRAND = Symbol.for('compact-js/CompiledContract');

// Any well-formed contract address: the era fork is the first thing each entry point does, so no
// call below reaches the address validation that follows it.
const CONTRACT_ADDRESS_FIXTURE = '00'.repeat(35);

// The fixture's generated code opens with `checkRuntimeVersion('0.16.0')`, which the installed
// (current) `@midnight-ntwrk/compact-runtime` rejects outright, and then builds type descriptors
// and an empty context at module scope. Only what that module-scope code touches is stubbed here:
// nothing in this test EXECUTES a circuit or a constructor, it only inspects the members the
// generated class installs, and every one of those is generated code rather than runtime code.
//
// An insufficient stub cannot pass silently — the module's top-level code would throw during
// import and the whole suite would fail loudly — which is why a stub is safe here where
// `packages/protocol` needs the real retained runtime injected instead.
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

const loadCounter016 = async (): Promise<Counter016Module> => import(/* @vite-ignore */ COUNTER_016_MODULE);
const loadCoinReceiver016 = async (): Promise<CoinReceiver016Module> =>
  import(/* @vite-ignore */ COIN_RECEIVER_016_MODULE);

describe('the retained-era contract family matches the real compact-runtime@0.16 artifact', () => {
  let contract: Counter016Contract;
  let contractModule: Counter016Module;

  beforeAll(async () => {
    contractModule = await loadCounter016();
    contract = new contractModule.Contract({});
  });

  it('installs exactly the four members the family declares, and no others', () => {
    const ownMembers = Object.keys(contract);

    expect(ownMembers.sort()).toEqual(['circuits', 'impureCircuits', 'provableCircuits', 'witnesses'].sort());
  });

  it('exposes initialState as a SYNCHRONOUS function — the load-bearing half of the era discriminator', () => {
    expect(typeof contract.initialState).toBe('function');
    // `AsyncFunction` here would mean the artifact was produced by the current toolchain, whose
    // codegen is fully async. `Function` is what makes the retained shape structurally distinct.
    expect(contract.initialState.constructor.name).toBe('Function');
  });

  it('exposes every impure circuit as a SYNCHRONOUS function', () => {
    const circuitIds = Object.keys(contract.impureCircuits);
    expect(circuitIds.sort()).toEqual(['increment']);

    const asyncCircuitIds = Object.entries(contract.impureCircuits)
      .filter(([, circuit]) => circuit.constructor.name !== 'Function')
      .map(([circuitId]) => circuitId);
    expect(asyncCircuitIds).toEqual([]);
  });

  it('sets provableCircuits as well as impureCircuits, so neither one discriminates the era on its own', () => {
    // The reason the family is built on sync-versus-async rather than on which circuit collections
    // are present: the retained artifact sets BOTH, exactly as the current era's does.
    expect(Object.keys(contract.provableCircuits).sort()).toEqual(Object.keys(contract.impureCircuits).sort());
    expect(Object.keys(contract.circuits).sort()).toEqual(Object.keys(contract.impureCircuits).sort());
  });

  it('carries no current-era CompiledContract brand, so the two eras cannot be confused at runtime either', () => {
    expect(COMPILED_CONTRACT_BRAND in contract).toBe(false);
    expect('tag' in contract).toBe(false);
  });

  it('ships no declaration file, which is why the family is hand-written rather than imported', () => {
    // If the retained toolchain ever starts emitting an `index.d.ts`, this fails and
    // `../ledger8-contract.ts` should be replaced by an import of the generated type.
    expect(() => readFileSync(resolve(COUNTER_016_DIR, 'index.d.ts'))).toThrow();
    // The current era's twin fixture DOES ship one — so the absence above is a property of the
    // retained toolchain, not of how the fixtures happen to be checked in.
    expect(readFileSync(TWIN_018_MODULE_TYPES, 'utf8')).toContain('export declare class Contract');
  });

  it('exports no expectedVk, unlike the current era whose modules always do', () => {
    expect('expectedVk' in contractModule).toBe(false);
  });

  describe('the same facts hold for the ARGUMENT-TAKING artifact, not just the zero-argument one', () => {
    // The second half of the pairing, and the reason it exists: every structural fact above was
    // asserted against a circuit that takes no arguments of its own, so nothing tied the family's
    // handling of real circuit ARGUMENTS to a real artifact. `coin-receiver-016`'s `receive_coin`
    // takes one (its own arity guard is `args_1.length !== 2`, against the counter's `!== 1`), and
    // `typecheck/overloads.test-d.ts` asserts the retained-era overload RESOLVES for it. These
    // assertions are what keep the hand-written `CoinReceiver016Contract` tied to the generated
    // code that type describes.
    let coinReceiver: CoinReceiver016Contract;
    let coinReceiverModule: CoinReceiver016Module;

    beforeAll(async () => {
      coinReceiverModule = await loadCoinReceiver016();
      coinReceiver = new coinReceiverModule.Contract({});
    });

    it('installs exactly the four members the family declares, and no others', () => {
      expect(Object.keys(coinReceiver).sort()).toEqual(
        ['circuits', 'impureCircuits', 'provableCircuits', 'witnesses'].sort()
      );
    });

    it('exposes initialState and every impure circuit as SYNCHRONOUS functions', () => {
      expect(typeof coinReceiver.initialState).toBe('function');
      expect(coinReceiver.initialState.constructor.name).toBe('Function');

      expect(Object.keys(coinReceiver.impureCircuits).sort()).toEqual(['receive_coin']);
      const asyncCircuitIds = Object.entries(coinReceiver.impureCircuits)
        .filter(([, circuit]) => circuit.constructor.name !== 'Function')
        .map(([circuitId]) => circuitId);
      expect(asyncCircuitIds).toEqual([]);
    });

    it('really does take one argument beyond the context, which is what the counter cannot show', () => {
      // Read off the generated arity guard rather than the compact source: the guard is what the
      // artifact enforces, and `2` is the context plus one real argument. The counter's is `1`.
      const source = readFileSync(COIN_RECEIVER_016_MODULE, 'utf8');
      expect(source).toContain('receive_coin: expected 2 arguments');
      expect(readFileSync(COUNTER_016_MODULE, 'utf8')).toContain('increment: expected 1 argument');
    });

    it('carries no current-era CompiledContract brand either', () => {
      expect(COMPILED_CONTRACT_BRAND in coinReceiver).toBe(false);
      expect('tag' in coinReceiver).toBe(false);
    });

    it('ships no declaration file and exports no expectedVk, like the other retained artifact', () => {
      expect(() => readFileSync(resolve(COIN_RECEIVER_016_DIR, 'index.d.ts'))).toThrow();
      expect('expectedVk' in coinReceiverModule).toBe(false);
    });
  });

  describe('the era dispatch fork routes the real artifact away from the current-era pipeline', () => {
    // The overloads accept the retained-era shape but nothing executes it yet. These assertions
    // are what prove the fork is WIRED: each entry point recognises the real artifact and refuses
    // it by name, instead of falling through into the current-era pipeline and failing somewhere
    // unrelated to the era.
    // The shared mock is keyed by `string`, and `ZKConfigProvider<K>` reports `K` back out of
    // `getVerifierKeys`, so a `string`-keyed one is not a `'increment'`-keyed one. Only that single
    // provider has to be re-narrowed; the rest of the shared mock spreads in unchanged.
    const zkConfigProvider: ZKConfigProvider<'increment'> = {
      getZKIR: vi.fn(),
      getProverKey: vi.fn(),
      getVerifierKey: vi.fn(),
      getVerifierKeys: vi.fn(),
      get: vi.fn(),
      asKeyMaterialProvider: vi.fn()
    };
    const providers: Ledger8ContractProviders<Counter016Contract, 'increment'> = {
      ...createMockProviders(),
      zkConfigProvider
    };

    it('recognises the real artifact as retained-era, and the current-era container as not', () => {
      expect(isLedger8Options({ compiledContract: contract })).toBe(true);
      expect(isLedger8Options({ compiledContract: { tag: 'counter', pipe: (): void => undefined } })).toBe(false);
      expect(isLedger8Options({ compiledContract: undefined })).toBe(false);
    });

    // No `args` on these options: the fixture circuit takes no arguments of its own, and
    // `Ledger8CallTxOptionsBase` omits `args` entirely in that case, exactly as the current era's
    // `CallOptionsWithArguments` does.
    it('refuses a retained-era submitCallTx', async () => {
      await expect(
        submitCallTx(providers, { compiledContract: contract, contractAddress: CONTRACT_ADDRESS_FIXTURE, circuitId: 'increment' })
      ).rejects.toThrow(LEDGER8_PIPELINE_NOT_WIRED);
    });

    it('refuses a retained-era submitCallTxAsync', async () => {
      await expect(
        submitCallTxAsync(providers, { compiledContract: contract, contractAddress: CONTRACT_ADDRESS_FIXTURE, circuitId: 'increment' })
      ).rejects.toThrow(LEDGER8_PIPELINE_NOT_WIRED);
    });

    it('refuses a retained-era deployContract', async () => {
      await expect(deployContract(providers, { compiledContract: contract })).rejects.toThrow(LEDGER8_PIPELINE_NOT_WIRED);
    });

    it('refuses a retained-era findDeployedContract', async () => {
      await expect(findDeployedContract(providers, { compiledContract: contract, contractAddress: CONTRACT_ADDRESS_FIXTURE })).rejects.toThrow(
        LEDGER8_PIPELINE_NOT_WIRED
      );
    });
  });
});
