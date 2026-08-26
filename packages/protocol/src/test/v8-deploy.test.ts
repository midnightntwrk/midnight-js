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

import { ComposeFailedError, ComposeOptionError, PROTOCOL_ERROR_CODES } from '../errors';
import { entryPointName } from '../lib/shared/verifier-keys';
import {
  type ComposeV8DeployOptions,
  composeV8DeployTx,
  executeConstructor,
  type ExecuteConstructorOptions,
  type Ledger8ConstructorContractLike,
  type Ledger8ConstructorResult,
  type Ledger8ConstructorRuntime
} from '../lib/v8/deploy';

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);

// Same literal tag as v8-compose.test.ts — both legs produce an
// UnprovenTransaction (SignatureEnabled/PreProof/PreBinding), so the tag is
// identical regardless of whether the transaction carries a deploy or a call.
// It contains `proof-preimage`, so asserting it is also what shows the
// transaction was never proven.
const V8_UNPROVEN_TX_TAG = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';

const KEYS_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys');
const REGISTERED_VERIFIER_KEY = new Uint8Array(readFileSync(resolve(KEYS_DIR, 'increment.verifier')));

// Same redirect precedent as v8-execute.test.ts: the ported artifact's
// bare `@midnight-ntwrk/compact-runtime` import is scoped to this file's
// module registry, so it never leaks into other suites. Vitest hoists
// `vi.mock` out of any nesting, so it is written at top level to read the way
// it executes.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

describe('entryPointName', () => {
  it('returns a string entry-point name unchanged', () => {
    expect(entryPointName('increment')).toBe('increment');
  });

  // The vendor behaviour entryPointName's existence is reasoned about:
  // `operations()` is DECLARED `Array<string | Uint8Array>`, but ledger-v8
  // decodes an entry point set from bytes back to a string. If that ever
  // changes, the byte arm below stops being dead in practice — and this test
  // is what says so.
  it('is only ever handed strings by ledger-v8 today: a byte-set entry point reads back as a string', () => {
    const contractState = new LedgerV8.ContractState();
    contractState.setOperation(new TextEncoder().encode('increment'), new LedgerV8.ContractOperation());

    expect(contractState.operations()).toEqual(['increment']);
  });

  it('decodes a byte-array entry-point name to its text, never to its byte values', () => {
    expect(entryPointName(new TextEncoder().encode('increment'))).toBe('increment');
  });
});

describe('executeConstructor (fake runtime — plumbing only, no WASM execution)', () => {
  it('builds the constructor context, invokes initialState with the given args, and packages a ConstructorResultPojo', () => {
    const finalContractState = { serialize: () => new Uint8Array([1, 2, 3]) };
    let capturedPrivateState: unknown;
    let capturedCoinPk: unknown;
    let capturedArgs: unknown;
    let capturedContext: unknown;

    const runtime: Ledger8ConstructorRuntime = {
      createConstructorContext: (privateState, coinPk) => {
        capturedPrivateState = privateState;
        capturedCoinPk = coinPk;
        return { marker: 'constructor-context' };
      }
    };
    const contract: Ledger8ConstructorContractLike = {
      initialState: (constructorContext, ...args): Ledger8ConstructorResult => {
        capturedContext = constructorContext;
        capturedArgs = args;
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
    expect(capturedContext).toEqual({ marker: 'constructor-context' });
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

    const result = executeConstructor({ contract, args: [], privateState: initialPrivateState, coinPk: SAMPLE_COIN_PUBLIC_KEY }, runtime);

    // Every assertion reads executeConstructor's OWN result. `ledger()` is the
    // contract's projector over a native onchain-runtime-v3 state, so the
    // round is read off the pre-fork state directly; crossing a
    // ledger-v8-bridged ChargedState through it would mix two WASM instances.
    const constructed = result.contractState;
    expect(constructed).toBeInstanceOf(ocrt3.ContractState);
    if (!(constructed instanceof ocrt3.ContractState)) {
      throw new Error('executeConstructor did not return the pre-fork ContractState the fixture built');
    }
    expect(ledger(constructed.data).round).toBe(0n);
    expect(result.privateState).toEqual(initialPrivateState);

    // The premise the deploy leg is built on: a constructor declares its entry
    // points but leaves every verifier key blank, which is why composeV8DeployTx
    // requires a key for each one. If ledger-v8 ever reported a blank slot as
    // something other than `undefined`, this is the test that would say so.
    const ledgerCS = LedgerV8.ContractState.deserialize(result.contractState.serialize());
    expect(ledgerCS.operations()).toEqual(['increment']);
    expect(ledgerCS.operation('increment')?.verifierKey).toBeUndefined();
  });
});

describe('composeV8DeployTx (real ledger-v8 WASM)', () => {
  const buildPreForkState = (circuitIds: readonly string[]): ocrt3.ContractState => {
    const blankState = new ocrt3.ContractState();
    for (const circuitId of circuitIds) {
      blankState.setOperation(circuitId, new ocrt3.ContractOperation());
    }
    return blankState;
  };

  const buildDeployOptions = (
    verifierKeys: ReadonlyMap<string, Uint8Array>,
    circuitIds: readonly string[] = ['increment']
  ): ComposeV8DeployOptions => ({
    contractState: buildPreForkState(circuitIds).serialize(),
    verifierKeys,
    networkId: NETWORK_ID,
    ttl: TTL
  });

  const deployedStateOf = (bytes: Uint8Array): LedgerV8.ContractState => {
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const deploys = [...(back.intents?.values() ?? [])]
      .flatMap((intent) => intent.actions)
      .filter((action) => action instanceof LedgerV8.ContractDeploy);
    expect(deploys).toHaveLength(1);
    return deploys[0].initialState;
  };

  const deployedAddressOf = (bytes: Uint8Array): string => {
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const deploys = [...(back.intents?.values() ?? [])]
      .flatMap((intent) => intent.actions)
      .filter((action) => action instanceof LedgerV8.ContractDeploy);
    expect(deploys).toHaveLength(1);
    return deploys[0].address;
  };

  it('composes and serializes a v8-native deploy transaction, tag-prefixed exactly as ledger-v8 emits it', () => {
    const { transaction: bytes } = composeV8DeployTx(
      buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])),
      LedgerV8
    );

    expect(bytes).toBeInstanceOf(Uint8Array);
    const tag = Buffer.from(bytes.subarray(0, V8_UNPROVEN_TX_TAG.length)).toString('latin1');
    expect(tag).toBe(V8_UNPROVEN_TX_TAG);
  });

  it('round-trips through the real v8 decoder: deserialize then re-serialize yields byte-identical output', () => {
    const { transaction: bytes } = composeV8DeployTx(
      buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])),
      LedgerV8
    );

    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);

    expect(Buffer.from(back.serialize())).toEqual(Buffer.from(bytes));
  });

  // A single-circuit deploy cannot show that EVERY map entry is registered:
  // stopping after the first one would pass it. Two circuits can. The fixtures
  // commit exactly one real verifier key (`increment.verifier`) and the setter
  // rejects anything that is not a genuine tagged key, so both slots carry the
  // same bytes here — enough to catch a partial or mis-keyed registration
  // (`operations()` names the slots), not enough to catch two identical keys
  // being swapped, which is not a behaviour difference.
  it('registers a verifier key for every circuit the key map covers, keyed by circuit id', () => {
    const verifierKeys = new Map([
      ['increment', REGISTERED_VERIFIER_KEY],
      ['decrement', REGISTERED_VERIFIER_KEY]
    ]);

    const { transaction: bytes, contractAddress, initialState } = composeV8DeployTx(
      buildDeployOptions(verifierKeys, ['increment', 'decrement']),
      LedgerV8
    );

    const deployed = deployedStateOf(bytes);
    expect(deployed.operations().sort()).toEqual(['decrement', 'increment']);
    expect(Buffer.from(deployed.operation('increment')?.verifierKey ?? new Uint8Array())).toEqual(Buffer.from(REGISTERED_VERIFIER_KEY));
    expect(Buffer.from(deployed.operation('decrement')?.verifierKey ?? new Uint8Array())).toEqual(Buffer.from(REGISTERED_VERIFIER_KEY));
    // The address and the registered initial state come back with the
    // transaction: a deploy mints a fresh nonce, so a caller cannot recompute
    // the address from the state it passed in.
    expect(contractAddress).toBe(deployedAddressOf(bytes));
    expect(Buffer.from(initialState)).toEqual(Buffer.from(deployed.serialize()));
  });

  it('throws ComposeFailedError (stage deploy-verifier-key) naming the declared circuit the key map does not cover', () => {
    const verifierKeys = new Map([['increment', REGISTERED_VERIFIER_KEY]]);

    let caught: unknown;
    try {
      composeV8DeployTx(buildDeployOptions(verifierKeys, ['increment', 'decrement']), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(error.stage).toBe('deploy-verifier-key');
    expect(error.circuitId).toBe('decrement');
  });

  // The fail-open case: `setOperation` CREATES a slot, so without this check a
  // stray key would deploy a contract with an entry point its source never had,
  // at an address the caller's artifacts do not describe.
  it('throws ComposeFailedError (stage deploy-unknown-circuit) for a key naming a circuit the state does not declare', () => {
    const verifierKeys = new Map([
      ['increment', REGISTERED_VERIFIER_KEY],
      ['stale-from-an-earlier-compile', REGISTERED_VERIFIER_KEY]
    ]);

    let caught: unknown;
    try {
      composeV8DeployTx(buildDeployOptions(verifierKeys), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.stage).toBe('deploy-unknown-circuit');
    expect(error.circuitId).toBe('stale-from-an-earlier-compile');
  });

  it('throws ComposeFailedError (stage deploy-verifier-key-blob) with the ledger failure on cause when the key bytes are not a verifier key', () => {
    const verifierKeys = new Map([['increment', new Uint8Array([1, 2, 3])]]);

    let caught: unknown;
    try {
      composeV8DeployTx(buildDeployOptions(verifierKeys), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.stage).toBe('deploy-verifier-key-blob');
    expect(error.circuitId).toBe('increment');
    expect(error.cause).toBeDefined();
    // The ledger's own diagnosis is preserved rather than flattened into text.
    expect(error.message).not.toContain('1,2,3');
  });

  it('throws ComposeOptionError (contractState) with the decoder failure on cause when the state cannot be bridged into the v8 era', () => {
    const notAContractState = new Uint8Array([9, 9, 9]);

    let caught: unknown;
    try {
      composeV8DeployTx({ ...buildDeployOptions(new Map()), contractState: notAContractState }, LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    const error = caught as ComposeOptionError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID);
    expect(error.option).toBe('contractState');
    expect(error.cause).toBeDefined();
  });

  it('refuses an empty network id rather than baking it into the transaction', () => {
    const options = { ...buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), networkId: '' };

    let caught: unknown;
    try {
      composeV8DeployTx(options, LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect((caught as ComposeOptionError).option).toBe('networkId');
  });

  it('refuses an invalid ttl rather than composing a transaction the ledger dates to the epoch', () => {
    const options = { ...buildDeployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), ttl: new Date('not-a-date') };

    let caught: unknown;
    try {
      composeV8DeployTx(options, LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect((caught as ComposeOptionError).option).toBe('ttl');
  });
});

// `ledger-v8` declares `operations(): Array<string | Uint8Array>` and accepts
// either form in `setOperation`/`operation`, but decodes every entry point
// back to a string today -- pinned by the `entryPointName` suite above. The
// byte half of that union is therefore unreachable through the real module,
// while still being part of the contract this code is written against. These
// cases reach it through a subclass that returns the byte form, keeping the
// rest of the module real (same interception precedent as the capturing
// prototype in v8-compose.test.ts).
describe('composeV8DeployTx against byte-array entry points', () => {
  const byteEntryPointV8 = (declared: readonly Uint8Array[], registered: (string | Uint8Array)[]): typeof LedgerV8 => {
    class ByteEntryPointContractState extends LedgerV8.ContractState {
      static override deserialize(): ByteEntryPointContractState {
        return new ByteEntryPointContractState();
      }

      override operations(): (string | Uint8Array)[] {
        return [...declared];
      }

      override setOperation(id: string | Uint8Array, value: LedgerV8.ContractOperation): void {
        registered.push(id);
        super.setOperation(id, value);
      }
    }
    return { ...LedgerV8, ContractState: ByteEntryPointContractState };
  };

  const deployOptions = (verifierKeys: ReadonlyMap<string, Uint8Array>): ComposeV8DeployOptions => ({
    contractState: new ocrt3.ContractState().serialize(),
    verifierKeys,
    networkId: NETWORK_ID,
    ttl: TTL
  });

  // 0xff and 0xfe are each an invalid UTF-8 sequence, so both decode to the
  // SAME replacement character. Two genuinely distinct declared entry points
  // therefore collapse to one name -- which is what makes the map-vs-declared
  // set arithmetic agree while one of the two slots would silently go
  // unregistered, deploying a contract at an address whose artifacts do not
  // describe it.
  const AMBIGUOUS_A = new Uint8Array([0xff]);
  const AMBIGUOUS_B = new Uint8Array([0xfe]);
  const AMBIGUOUS_NAME = new TextDecoder().decode(AMBIGUOUS_A);

  it('refuses two declared entry points that resolve to the same name instead of registering only one of them', () => {
    const registered: (string | Uint8Array)[] = [];
    const v8 = byteEntryPointV8([AMBIGUOUS_A, AMBIGUOUS_B], registered);

    let caught: unknown;
    try {
      composeV8DeployTx(deployOptions(new Map([[AMBIGUOUS_NAME, REGISTERED_VERIFIER_KEY]])), v8);
    } catch (error) {
      caught = error;
    }

    // The two byte sequences really are distinct, so this is a lossy resolution
    // and not two spellings of one entry point.
    expect(Buffer.from(AMBIGUOUS_A).equals(Buffer.from(AMBIGUOUS_B))).toBe(false);
    expect(entryPointName(AMBIGUOUS_A)).toBe(entryPointName(AMBIGUOUS_B));
    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(error.stage).toBe('deploy-ambiguous-circuit');
    expect(error.circuitId).toBe(AMBIGUOUS_NAME);
    expect(registered).toEqual([]);
  });

  it('registers against the entry point the state declares, not against its decoded name', () => {
    const declaredId = new TextEncoder().encode('increment');
    const registered: (string | Uint8Array)[] = [];
    const v8 = byteEntryPointV8([declaredId], registered);

    composeV8DeployTx(deployOptions(new Map([['increment', REGISTERED_VERIFIER_KEY]])), v8);

    // `setOperation` CREATES a slot rather than requiring one, so registering
    // under the decoded string would leave the declared byte slot unkeyed and
    // add a second, undeclared entry point next to it -- the same
    // silently-different-address failure `deploy-unknown-circuit` guards.
    expect(registered).toEqual([declaredId]);
  });
});
