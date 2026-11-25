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
  type ContractCall,
  CostModel,
  Intent,
  LedgerParameters,
  LedgerState,
  type PreProof,
  type ProvingProvider,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  sampleUserAddress,
  Transaction,
  type UnprovenTransaction,
  UnshieldedOffer,
  WellFormedStrictness,
  ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import { CompiledContract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import { sampleSigningKey } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  createVerifierKey,
  type FinalizedTx,
  LedgerTransaction,
  type ProverKey,
  type SerializedContractState,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnightntwrk/midnight-js-types';
import { vi } from 'vitest';

import { type Ledger9CallResult } from '../call';
import { type ScopedTransactionOptions } from '../transaction';
import { createLedger9UnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import { handles } from './ledger-transaction-fixtures';
import * as Callee from './resources/compiled/callee/contract/index.js';
import * as Caller from './resources/compiled/caller/contract/index.js';
import * as Checkpointed from './resources/compiled/checkpointed/contract/index.js';
import * as ShieldedMap from './resources/compiled/shielded-map/contract/index.js';
import * as Stamps from './resources/compiled/stamps/contract/index.js';
import * as UnshieldedBalance from './resources/compiled/unshielded-balance/contract/index.js';
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
 * - `unshielded-balance`: `mintToSelf` mints unshielded tokens to the contract, `sendToUser` pays them
 *   to a user, `balanceOf` reads the contract's balance of a token;
 * - `checkpointed`: writes enough state before a checkpoint that what follows it, a coin minted and
 *   sent to a user, is placed in the fallible half;
 * - `stamps`: `step` takes the next stamp from a witness that advances the caller's private state, and
 *   refuses a stamp that is not one more than the last, so a second call succeeds only on the private
 *   and public states the first left; `fillOne` to `fillThree` insert into a Merkle tree.
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
export type UnshieldedBalanceContract = UnshieldedBalance.Contract<undefined>;
export type CheckpointedContract = Checkpointed.Contract<undefined>;
export type StampsContract = Stamps.Contract<StampState>;

/** A private state its witness counts up, one at each call. */
export interface CountingState {
  readonly count: number;
}

/** The private state of `stamps`: the last stamp its `step` took. */
export interface StampState {
  readonly stamp: number;
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

export const unshieldedBalance = CompiledContract.make<UnshieldedBalanceContract>('unshielded-balance', UnshieldedBalance.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(compiledDirectory('unshielded-balance'))
);

export const checkpointed = CompiledContract.make<CheckpointedContract>('checkpointed', Checkpointed.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(compiledDirectory('checkpointed'))
);

/** `stamps`, whose `nextStamp` witness takes the stamp after the private state's and keeps it. */
export const stamps = CompiledContract.make<StampsContract>('stamps', Stamps.Contract).pipe(
  CompiledContract.withWitnesses({
    nextStamp: (ctx): [StampState, bigint] => [{ stamp: ctx.privateState.stamp + 1 }, BigInt(ctx.privateState.stamp + 1)]
  }),
  CompiledContract.withCompiledFileAssets(compiledDirectory('stamps'))
);

export const shieldedMapKeys = new CompiledKeys<'deposit'>('shielded-map');
export const unshieldedBalanceKeys = new CompiledKeys<'mintToSelf' | 'sendToUser' | 'balanceOf'>('unshielded-balance');
export const checkpointedKeys = new CompiledKeys<'heavyCheckpointMintAndSend'>('checkpointed');
export const calleeKeys = new CompiledKeys<'deposit' | 'mintAndSend'>('callee');
export const callerKeys = new CompiledKeys<'depositToCallee' | 'mintAndSendFromCallee'>('caller');
export const stampsKeys = new CompiledKeys<'step' | 'count' | 'fillOne' | 'fillTwo' | 'fillThree'>('stamps');

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

/** The state `unshielded-balance` is deployed with. */
export const deployedUnshieldedBalance = (): Promise<SerializedContractState<'v9'>> =>
  deployOnce('unshielded-balance', async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        unshieldedBalanceKeys,
        sampleCoinPublicKey(),
        { compiledContract: unshieldedBalance, signingKey: sampleSigningKey() },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      )
    ).public.initialContractState
  );

/** The state `checkpointed` is deployed with. */
export const deployedCheckpointed = (): Promise<SerializedContractState<'v9'>> =>
  deployOnce('checkpointed', async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        checkpointedKeys,
        sampleCoinPublicKey(),
        { compiledContract: checkpointed, signingKey: sampleSigningKey() },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      )
    ).public.initialContractState
  );

/** The state `stamps` is deployed with: no stamp taken yet. */
export const deployedStamps = (): Promise<SerializedContractState<'v9'>> =>
  deployOnce('stamps', async () =>
    (
      await createLedger9UnprovenDeployTxFromVerifierKeys(
        stampsKeys,
        sampleCoinPublicKey(),
        { compiledContract: stamps, signingKey: sampleSigningKey(), initialPrivateState: { stamp: 0 } },
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

/** The unproven transaction the scope handed to be proven last. */
export const lastProvenInput = (proveTx: unknown): UnprovenTransaction => {
  const [unprovenTx] = vi.mocked(proveTx as (tx: { deserialize: (d: object) => unknown }) => unknown).mock.lastCall!;
  return unprovenTx.deserialize({ v9: Transaction }) as UnprovenTransaction;
};

/** The unproven transaction the scope handed to be proven. */
export const provenInput = (proveTx: unknown): UnprovenTransaction => {
  const [[unprovenTx]] = vi.mocked(proveTx as (tx: { deserialize: (d: object) => unknown }) => unknown).mock.calls;
  return unprovenTx.deserialize({ v9: Transaction }) as UnprovenTransaction;
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

/** The contract calls of a transaction, intent by intent. */
export const callsOf = (tx: UnprovenTransaction): ContractCall<PreProof>[] =>
  [...(tx.intents?.values() ?? [])].flatMap((intent) => intent.actions as ContractCall<PreProof>[]);

const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

export const unshieldedOffer = (outputs: number) =>
  UnshieldedOffer.new(
    [],
    Array.from({ length: outputs }, () => ({ value: 5n, owner: sampleUserAddress(), type: '00'.repeat(32) })),
    []
  );

/** A finalized transaction of one intent with `outputs` unshielded outputs in `half`, as a wallet could answer. */
export const finalizedWithUnshieldedOutputs = async (outputs: number, half: 'guaranteed' | 'fallible') => {
  const intent = Intent.new(new Date(Date.now() + 3_600_000));
  if (half === 'guaranteed') intent.guaranteedUnshieldedOffer = unshieldedOffer(outputs);
  else intent.fallibleUnshieldedOffer = unshieldedOffer(outputs);
  const unbound = await Transaction.fromParts(MOCK_CONFIG.networkId, undefined, undefined, intent).prove(
    inertProvingProvider,
    CostModel.initialCostModel()
  );
  return LedgerTransaction.seal('v9', 'Finalized', unbound.bind());
};

/**
 * A finalized transaction of `count` intents, at segments 1 to `count`, each with one guaranteed
 * unshielded output, as a wallet could answer: it has one identifier per intent.
 */
export const finalizedOfIntents = async (count: number) => {
  const tx = Transaction.fromParts(MOCK_CONFIG.networkId);
  tx.intents = new Map(
    Array.from({ length: count }, (_, index) => {
      const intent = Intent.new(new Date(Date.now() + 3_600_000));
      intent.guaranteedUnshieldedOffer = unshieldedOffer(1);
      return [index + 1, intent];
    })
  );
  const unbound = await tx.prove(inertProvingProvider, CostModel.initialCostModel());
  return LedgerTransaction.seal('v9', 'Finalized', unbound.bind());
};

/** The identifiers of a finalized ledger 9 transaction, in the order the ledger lists them. */
export const identifiersOf = (finalized: FinalizedTx): string[] =>
  LedgerTransaction.fromBytes('v9', 'Finalized', finalized.serialize()).deserialize({ v9: Transaction }).identifiers();

/** A coin public key of the `undeployed` network in Bech32m, the notation a wallet hands out. */
export const BECH32M_COIN_PUBLIC_KEY = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';

/** An encryption public key of the `undeployed` network in Bech32m, and the same key in hex. */
export const BECH32M_ENCRYPTION_PUBLIC_KEY = {
  bech32m: 'mn_shield-epk_undeployed12lylpluzqw85h3wwdntasa4ugrgwt3fyn5ev6832fhxl5nw8v5ks8sn908',
  hex: '57c9f0ff82038f4bc5ce6cd7d876bc40d0e5c5249d32cd1e2a4dcdfa4dc7652d'
} as const;

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

/** Providers over a chain holding a deployed `stamps` at each of `addresses`. */
export const chainWithStamps = async (count = 1) => {
  const addresses = Array.from({ length: count }, () => createMockContractAddress());
  const chain = await chainOf(new Map(addresses.map((address) => [address, deployedStamps()])));
  return { ...chain, addresses };
};

export const step = (contractAddress: string, privateStateId: string) => ({
  compiledContract: stamps,
  contractAddress,
  circuitId: 'step' as const,
  privateStateId
});

/**
 * Providers over a chain holding one `stamps`, which record when the transaction is submitted and
 * when it is waited for. The wallet balances every transaction into `balanced`, of two intents, whose
 * identifiers are `identifiers`; `submitTx` answers `'tx-id'`.
 */
export const chainRecordingOrder = async () => {
  const {
    withKeys,
    addresses: [address]
  } = await chainWithStamps();
  const wallet = withKeys(stampsKeys);
  wallet.stored.set(`${address}:id`, { stamp: 0 });
  const balanced = await finalizedOfIntents(2);
  vi.mocked(wallet.providers.walletProvider.balanceTx).mockResolvedValue(balanced);
  const events: string[] = [];
  vi.mocked(wallet.providers.midnightProvider.submitTx).mockImplementation(() => {
    events.push('submitted');
    return Promise.resolve('tx-id');
  });
  vi.mocked(wallet.providers.publicDataProvider.watchForTxData).mockImplementation(() => {
    events.push('waited');
    return Promise.resolve(createMockFinalizedTxData());
  });
  return { address, providers: wallet.providers, stored: wallet.stored, events, balanced, identifiers: identifiersOf(balanced) };
};

/** Providers over a chain holding one deployed `stamps`, serving `ledgerParameters`. */
export const stampsChain = async (ledgerParameters?: LedgerParameters) => {
  const address = createMockContractAddress();
  const chain = await chainOf(new Map([[address, deployedStamps()]]), [], ledgerParameters);
  const wallet = chain.withKeys(stampsKeys);
  wallet.stored.set(`${address}:id`, { stamp: 0 });
  return { address, providers: wallet.providers };
};

export const fillTwo = (contractAddress: string, seed: number) => ({
  compiledContract: stamps,
  contractAddress,
  circuitId: 'fillTwo' as const,
  args: [new Uint8Array(32).fill(seed)] as [Uint8Array],
  privateStateId: 'id'
});

export const count = (contractAddress: string) => ({
  compiledContract: stamps,
  contractAddress,
  circuitId: 'count' as const,
  privateStateId: 'id'
});

/** Which halves each contract call of a transaction has a transcript in. */
export const halvesOf = (calls: ReturnType<typeof callsOf>): [boolean, boolean][] =>
  calls.map((call) => [call.guaranteedTranscript !== undefined, call.fallibleTranscript !== undefined]);

export const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (reason: unknown) => reason
  );

/** A ledger integer in the compact form its serialization uses. */
const compactInteger = (value: bigint): Buffer => {
  if (value < 1n << 6n) return Buffer.from([Number(value << 2n)]);
  if (value < 1n << 14n) return Buffer.from(new Uint16Array([Number((value << 2n) | 1n)]).buffer);
  if (value < 1n << 30n) return Buffer.from(new Uint32Array([Number((value << 2n) | 2n)]).buffer);
  const bytes: number[] = [];
  for (let rest = value; rest > 0n; rest >>= 8n) bytes.push(Number(rest & 0xffn));
  return Buffer.from([((bytes.length - 4) << 2) | 3, ...bytes]);
};

/**
 * The initial ledger parameters with the time to dismiss a transaction may take set to
 * `perBytePicoseconds` per byte of its size, and at least `minimumPicoseconds`. The partitioner
 * reads the same limits, so they also decide which half a call is placed in.
 */
export const parametersWithTimeToDismiss = (perBytePicoseconds: bigint, minimumPicoseconds: bigint): LedgerParameters => {
  const initial = Buffer.from(LedgerParameters.initialParameters().serialize());
  const byteLimit = compactInteger(1n << 20n);
  const initialLimits = Buffer.concat([byteLimit, compactInteger(2_000_000n), compactInteger(15_000_000_000n)]);
  const at = initial.indexOf(initialLimits);
  if (at < 0) {
    throw new Error('The initial ledger parameters no longer hold the time to dismiss limits this test rewrites.');
  }
  return LedgerParameters.deserialize(
    Buffer.concat([
      initial.subarray(0, at),
      byteLimit,
      compactInteger(perBytePicoseconds),
      compactInteger(minimumPicoseconds),
      initial.subarray(at + initialLimits.length)
    ])
  );
};

/** The options of a scope that places its calls in the fallible section. */
export const IN_FALLIBLE_SECTION: ScopedTransactionOptions = { inFallibleSection: true };
