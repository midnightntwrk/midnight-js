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
import { fileURLToPath } from 'node:url';

import {
  LedgerParameters,
  LedgerState,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  type UnprovenTransaction,
  WellFormedStrictness,
  ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import { CompiledContract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import { sampleSigningKey } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  createVerifierKey,
  type ProverKey,
  type SerializedContractState,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnightntwrk/midnight-js-types';
import { vi } from 'vitest';

import { type Ledger9CallResult } from '../call';
import { createLedger9UnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import { handles } from './ledger-transaction-fixtures';
import * as Callee from './resources/compiled/callee/contract/index.js';
import * as Caller from './resources/compiled/caller/contract/index.js';
import * as ShieldedMap from './resources/compiled/shielded-map/contract/index.js';
import {
  createMockContractAddress,
  createMockEncryptionPublicKey,
  createMockFinalizedTxData,
  createMockPrivateStateProvider,
  createMockProviders,
  MOCK_CONFIG,
  publicStatesRead,
  separateContractStates
} from './test-mocks';

/*
 * Compiled test contracts with real circuits and keys, to build real unproven transactions of
 * scoped calls without a chain:
 * - `shielded-map`: `deposit(coin)` receives the coin, records it and increments `counter`;
 * - `callee`: `deposit(coin)` receives the coin, `mintAndSend` mints a coin and sends part of it on;
 * - `caller`: calls the `callee` given to its constructor, so every call of it has a callee;
 */

const compiledDirectory = (name: string): string =>
  fileURLToPath(new URL(`./resources/compiled/${name}`, import.meta.url));

/** The verifier keys of a compiled test contract, read from its `keys` directory. */
export class CompiledKeys<K extends string> extends ZKConfigProvider<K> {
  constructor(private readonly name: string) {
    super();
  }
  getZKIR(): Promise<ZKIR> {
    throw new Error('not read without proving');
  }
  getProverKey(): Promise<ProverKey> {
    throw new Error('not read without proving');
  }
  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return Promise.resolve(
      createVerifierKey(new Uint8Array(readFileSync(`${compiledDirectory(this.name)}/keys/${circuitId}.verifier`)))
    );
  }
  override getArtifactRuntimeVersion(): Promise<string> {
    return Promise.resolve('0.21.0');
  }
}

export type ShieldedMapContract = ShieldedMap.Contract<undefined>;
export type CountingShieldedMapContract = ShieldedMap.Contract<CountingState>;
export type CalleeContract = Callee.Contract<undefined>;
export type CallerContract = Caller.Contract<undefined>;
/** A private state its witness counts up, one at each call. */
export interface CountingState {
  readonly count: number;
}

export const shieldedMap = CompiledContract.make<ShieldedMapContract>('shielded-map', ShieldedMap.Contract).pipe(
  CompiledContract.withWitnesses({ dummy: (ctx): [undefined, []] => [ctx.privateState, []] }),
  CompiledContract.withCompiledFileAssets(compiledDirectory('shielded-map'))
);

/** `shielded-map` with a witness that advances the private state of every call by one. */
export const countingShieldedMap = CompiledContract.make<CountingShieldedMapContract>('shielded-map', ShieldedMap.Contract).pipe(
  CompiledContract.withWitnesses({ dummy: (ctx): [CountingState, []] => [{ count: ctx.privateState.count + 1 }, []] }),
  CompiledContract.withCompiledFileAssets(compiledDirectory('shielded-map'))
);

export const callee = CompiledContract.make<CalleeContract>('callee', Callee.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(compiledDirectory('callee'))
);

export const caller = CompiledContract.make<CallerContract>('caller', Caller.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(compiledDirectory('caller'))
);

export const shieldedMapKeys = new CompiledKeys<'deposit'>('shielded-map');
export const calleeKeys = new CompiledKeys<'deposit' | 'mintAndSend'>('callee');
export const callerKeys = new CompiledKeys<'depositToCallee' | 'mintAndSendFromCallee'>('caller');
const deployedStates = new Map<string, Promise<SerializedContractState<'v9'>>>();

const deployOnce = (key: string, deploy: () => Promise<SerializedContractState<'v9'>>): Promise<SerializedContractState<'v9'>> => {
  const held = deployedStates.get(key) ?? deploy();
  deployedStates.set(key, held);
  return held;
};

/** The state `shielded-map` is deployed with. */
export const deployedShieldedMap = (): Promise<SerializedContractState<'v9'>> =>
  deployOnce('shielded-map', async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        shieldedMapKeys,
        sampleCoinPublicKey(),
        { compiledContract: shieldedMap, signingKey: sampleSigningKey() },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      )
    ).public.initialContractState
  );

/** The state `callee` is deployed with. */
export const deployedCallee = (): Promise<SerializedContractState<'v9'>> =>
  deployOnce('callee', async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        calleeKeys,
        sampleCoinPublicKey(),
        { compiledContract: callee, signingKey: sampleSigningKey() },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      )
    ).public.initialContractState
  );

/** The state `caller` is deployed with, calling the callee at `calleeAddress`. */
export const deployedCaller = (calleeAddress: string): Promise<SerializedContractState<'v9'>> =>
  deployOnce(`caller ${calleeAddress}`, async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        callerKeys,
        sampleCoinPublicKey(),
        { compiledContract: caller, signingKey: sampleSigningKey(), args: [{ bytes: new Uint8Array(Buffer.from(calleeAddress, 'hex')) }] },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      )
    ).public.initialContractState
  );

/**
 * Providers over a chain holding `contracts`, by address, whose proving, balancing and submission
 * answer at once, with one wallet and the module of `callee` for every address in `callees`. Each call to
 * `withKeys` gives a provider set of its own for one contract's keys and private states. Every read
 * serves `ledgerParameters`.
 */
export const chainOf = async (
  contracts: ReadonlyMap<string, Promise<SerializedContractState<'v9'>>>,
  callees: readonly string[] = [],
  ledgerParameters: LedgerParameters = LedgerParameters.initialParameters()
) => {
  const base = createMockProviders();
  const coinPublicKey = sampleCoinPublicKey();
  const encryptionPublicKey = sampleEncryptionPublicKey();
  const zswapChainState = new ZswapChainState();
  const states = new Map(await Promise.all(Array.from(contracts, async ([address, state]) => [address, await state] as const)));
  vi.mocked(base.publicDataProvider.queryZSwapAndContractState).mockImplementation((address) => {
    const contractState = states.get(String(address));
    return Promise.resolve(
      contractState === undefined
        ? null
        : publicStatesRead({ zswapChainState, ledgerParameters, contractState })
    );
  });
  vi.mocked(base.publicDataProvider.watchForTxData).mockResolvedValue(createMockFinalizedTxData());
  vi.mocked(base.proofProvider.proveTx).mockImplementation(() => handles.v9.Unbound());
  vi.mocked(base.walletProvider.balanceTx).mockImplementation(() => handles.v9.Finalized());
  vi.mocked(base.midnightProvider.submitTx).mockResolvedValue('tx-id');
  const shared = {
    ...base,
    walletProvider: { ...base.walletProvider, getCoinPublicKey: () => coinPublicKey, getEncryptionPublicKey: () => encryptionPublicKey },
    contractModuleProvider: {
      resolve: (address: string) => (callees.includes(String(address)) ? () => Promise.resolve(Callee) : undefined)
    }
  };
  /**
   * A provider set of its own for one contract's keys, with a private state store of its own: the
   * returned map holds what is stored, keyed `<contract address>:<private state id>`.
   */
  const withKeys = <K extends string>(zkConfigProvider: ZKConfigProvider<K>) => {
    const privateStateProvider = createMockPrivateStateProvider();
    const stored = separateContractStates(privateStateProvider);
    return { providers: { ...shared, zkConfigProvider, privateStateProvider }, stored };
  };
  return { providers: shared, withKeys, zswapChainState, coinPublicKey, encryptionPublicKey };
};

/**
 * Whether the ledger finds `tx` well formed, every check it makes of what the transcripts claim
 * included; balancing, proofs, signatures and limits are not checked, since the transaction is
 * neither balanced nor proven.
 */
export const ledgerWellFormed = (tx: UnprovenTransaction): true | string => {
  const strictness = new WellFormedStrictness();
  strictness.enforceBalancing = false;
  strictness.verifyNativeProofs = false;
  strictness.verifyContractProofs = false;
  strictness.verifySignatures = false;
  strictness.enforceLimits = false;
  try {
    tx.wellFormed(LedgerState.blank(MOCK_CONFIG.networkId), strictness, new Date());
    return true;
  } catch (error) {
    return String(error);
  }
};

/** Providers over a chain holding one deployed `shielded-map`, at `contractAddress`. */
export const chainWithShieldedMap = async () => {
  const contractAddress = createMockContractAddress();
  const chain = await chainOf(new Map([[contractAddress, deployedShieldedMap()]]));
  return { ...chain, providers: chain.withKeys(shieldedMapKeys).providers, contractAddress };
};

/** A shielded coin of value 100, its nonce filled with `nonce`. */
export const shieldedCoin = (nonce: number) => ({ nonce: new Uint8Array(32).fill(nonce), color: new Uint8Array(32).fill(2), value: 100n });

/** A `shielded-map` deposit of {@link shieldedCoin} at `contractAddress`. */
export const deposit = (contractAddress: string, nonce: number) => ({
  compiledContract: shieldedMap,
  contractAddress,
  circuitId: 'deposit' as const,
  args: [shieldedCoin(nonce)] as [ReturnType<typeof shieldedCoin>]
});

/** The `counter` a `shielded-map` deposit left. */
export const counterOf = (result: Ledger9CallResult<ShieldedMapContract, 'deposit'>): bigint =>
  ShieldedMap.ledger(result.public.nextContractState).counter;
