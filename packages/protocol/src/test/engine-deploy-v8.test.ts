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

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import { describe, expect, it, vi } from 'vitest';

import { Ledger8ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import {
  type ComposeV8DeployOptions,
  composeV8DeployTx,
  executeConstructor,
  type ExecuteConstructorOptions,
  type Ledger8ConstructorContractLike,
  type Ledger8ConstructorResult,
  type Ledger8ConstructorRuntime
} from '../lib/engine/deploy-v8';

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);

// Same literal tag as engine-compose-v8.test.ts — both legs produce an
// UnprovenTransaction (SignatureEnabled/PreProof/PreBinding), so the tag is
// identical regardless of whether the transaction carries a deploy or a call.
const V8_UNPROVEN_TX_TAG = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';

const REGISTERED_VERIFIER_KEY = new Uint8Array(
  readFileSync(resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier'))
);

// Same redirect precedent as engine-execute.test.ts: the ported artifact's
// bare `@midnight-ntwrk/compact-runtime` import is scoped to this file's
// module registry, so it never leaks into other suites. Must live at module
// top level — vitest hoists `vi.mock` regardless of nesting.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

describe('executeConstructor (fake runtime — plumbing only, no WASM execution)', () => {
  it('builds the constructor context, invokes initialState with the given args, and packages a ConstructorResultPojo', () => {
    const finalContractState = { serialize: () => new Uint8Array([1, 2, 3]) };
    let capturedPrivateState: unknown;
    let capturedCoinPk: unknown;
    let capturedArgs: unknown;

    const runtime: Ledger8ConstructorRuntime = {
      createConstructorContext: (privateState, coinPk) => {
        capturedPrivateState = privateState;
        capturedCoinPk = coinPk;
        return { marker: 'constructor-context' };
      }
    };
    const contract: Ledger8ConstructorContractLike = {
      initialState: (constructorContext, ...args): Ledger8ConstructorResult => {
        capturedArgs = args;
        expect(constructorContext).toEqual({ marker: 'constructor-context' });
        return { currentContractState: finalContractState, currentPrivateState: { count: 0 } };
      }
    };

    const options: ExecuteConstructorOptions = {
      contract,
      args: ['seed'],
      privateState: { initial: true },
      coinPk: 'ca'.repeat(32)
    };

    const result = executeConstructor(options, runtime);

    expect(result.contractState).toBe(finalContractState);
    expect(result.privateState).toEqual({ count: 0 });
    expect(capturedPrivateState).toEqual({ initial: true });
    expect(capturedCoinPk).toBe('ca'.repeat(32));
    expect(capturedArgs).toEqual(['seed']);
  });
});

describe('executeConstructor against the ported spike counter-016 fixture (real compact-runtime@0.16)', () => {
  const FIXTURE_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/counter-016');
  const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);

  interface CompiledCounterLedger {
    readonly round: bigint;
  }

  interface CompiledCounterContract extends Ledger8ConstructorContractLike {
    initialState(constructorContext: unknown): { currentContractState: ocrt3.ContractState; currentPrivateState: unknown };
  }

  interface CompiledCounterModule {
    readonly Contract: new (witnesses: Record<string, never>) => CompiledCounterContract;
    readonly ledger: (state: ocrt3.StateValue | ocrt3.ChargedState) => CompiledCounterLedger;
  }

  it('runs the counter constructor, producing a contract state with round 0 and a blank increment operation slot', async () => {
    const { Contract, ledger } = (await import(/* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js'))) as CompiledCounterModule;
    const ledger8Runtime = await import('compact-runtime-ledger8');

    const initialPrivateState: Record<string, never> = {};
    const contract = new Contract(initialPrivateState);
    const runtime: Ledger8ConstructorRuntime = { createConstructorContext: ledger8Runtime.createConstructorContext };

    // Two separate (deterministic, pure) constructor runs: one through
    // executeConstructor (the shape under test), one direct, so the round
    // number can be read off the native onchain-runtime-v3 state through the
    // contract's own `ledger()` projector — crossing `ledger(...)` a
    // ledger-v8-bridged ChargedState would mix two distinct WASM instances.
    const result = executeConstructor({ contract, args: [], privateState: initialPrivateState, coinPk: SAMPLE_COIN_PUBLIC_KEY }, runtime);
    const constructorContext = ledger8Runtime.createConstructorContext(initialPrivateState, SAMPLE_COIN_PUBLIC_KEY);
    const direct = contract.initialState(constructorContext);

    expect(ledger(direct.currentContractState.data).round).toBe(0n);

    const ledgerCS = LedgerV8.ContractState.deserialize(result.contractState.serialize());
    expect(ledgerCS.operations()).toEqual(['increment']);
    expect(ledgerCS.operation('increment')?.verifierKey).toBeUndefined();
  });
});

describe('composeV8DeployTx (real ledger-v8 WASM)', () => {
  const buildDeployOptions = (verifierKeys: ReadonlyMap<string, Uint8Array>): ComposeV8DeployOptions => {
    const blankState = new ocrt3.ContractState();
    blankState.setOperation('increment', new ocrt3.ContractOperation());
    return { contractState: blankState, verifierKeys, networkId: NETWORK_ID, ttl: TTL };
  };

  it('composes and serializes a v8-native deploy transaction, registering every supplied verifier key', () => {
    const bytes = composeV8DeployTx(buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), LedgerV8);

    expect(bytes).toBeInstanceOf(Uint8Array);
    const tag = Buffer.from(bytes.subarray(0, V8_UNPROVEN_TX_TAG.length)).toString('latin1');
    expect(tag).toBe(V8_UNPROVEN_TX_TAG);
  });

  it('round-trips through the real v8 decoder: deserialize then re-serialize yields byte-identical output', () => {
    const bytes = composeV8DeployTx(buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), LedgerV8);

    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);

    expect(Buffer.from(back.serialize())).toEqual(Buffer.from(bytes));
  });

  it('never proves the transaction: the serialized bytes carry a pre-proof tag, not a real proof', () => {
    const bytes = composeV8DeployTx(buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), LedgerV8);

    expect(Buffer.from(bytes).toString('latin1')).toContain('proof-preimage');
  });

  it('throws Ledger8ComposeFailedError (stage deploy-verifier-key) when a declared circuit has no verifier key after registration', () => {
    let caught: unknown;
    try {
      composeV8DeployTx(buildDeployOptions(new Map()), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeFailedError);
    const error = caught as Ledger8ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED);
    expect(error.stage).toBe('deploy-verifier-key');
    expect(error.circuitId).toBe('increment');
  });
});
