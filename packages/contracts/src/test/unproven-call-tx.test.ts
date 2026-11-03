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

import { COMMON_ERROR_CODES, ContractExecutionError, InvalidArgumentError, MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { LedgerParameters, Transaction, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import {
  type CircuitContext,
  type ContractModuleProvider,
  ContractState,
  type ContractStateProvider,
  StateValue
} from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { LEDGER_STATE_TAGS } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  type AnyProvableCircuitId,
  InvalidSerializedStateError,
  LedgerTransaction,
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { EraMismatchError, NetworkVersionReadFailedError } from '../errors';
import { GetCurrentStatesForIdentity, MergeUnsubmittedCallTxData, TransactionContextImpl, TypeId } from '../internal/transaction';
import { createUnprovenLedgerCallTx, makeCalleeStateResolver } from '../internal/utils';
import { createUnprovenCallTx, createUnprovenCallTxFromInitialStates } from '../unproven-call-tx';
import { createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createDefaultCircuit,
  createFailingCircuit,
  createMockCallOptions,
  createMockCallOptionsWithPrivateState,
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContract,
  createMockContractAddress,
  createMockEncryptionPublicKey,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockZKConfigProvider,
  MOCK_CONFIG,
  publicStatesRead,
  publicStatesReadStub
} from './test-mocks';

vi.mock('../get-states', () => ({
  getStates: vi.fn(),
  getPublicStates: vi.fn()
}));

vi.mock('../internal/utils', async () => {
  const ledger = await import('@midnight-ntwrk/midnight-js-protocol/v9');
  const runtime = await import('@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime');
  return {
    createUnprovenLedgerDeployTx: vi.fn(() => ['mock-contract-address', new runtime.ContractState(), ledger.Transaction.fromParts('undeployed')]),
    createUnprovenLedgerCallTx: vi.fn(() => ledger.Transaction.fromParts('undeployed')),
    createEncryptionPublicKeyResolver: vi.fn().mockReturnValue(() => 'encrypted-key'),
    encryptionPublicKeyResolverForZswapState: vi.fn().mockReturnValue(() => 'encrypted-key'),
    // Both: the call path uses zswapCallsToNewCoins, and the deploy this file sets up with reaches
    // zswapStateToNewCoins through unproven-deploy-tx.
    zswapCallsToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }]),
    zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }]),
    makeCalleeStateResolver: vi.fn()
  };
});

const createContextRecordingCircuit = (seen: CircuitContext[]) => {
  const circuit = createDefaultCircuit();
  return vi.fn().mockImplementation((ctx: CircuitContext) => {
    seen.push(ctx);
    return circuit(ctx);
  });
};

const BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';

describe('unproven-call-tx', () => {
  let initialContractState: Promise<SerializedContractState<'v9'>> | null = null;
  const getInitialContractState = async () => {
    const _ = async () => {
      const deploy = await createUnprovenDeployTxFromVerifierKeys(
        createMockZKConfigProvider(),
        createMockCoinPublicKey(),
        {
          compiledContract: createMockCompiledContract(),
          signingKey: createMockSigningKey(),
        },
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
      );

      return deploy.public.initialContractState;
    }
    return initialContractState || (initialContractState = _());
  }

  const ledger9StatesDecodingTo = async (contractState: SerializedContractState) =>
    publicStatesRead({
      zswapChainState: new ZswapChainState(),
      ledgerParameters: LedgerParameters.initialParameters(),
      contractState
    });

  describe('createUnprovenCallTxFromInitialStates', () => {
    it('should create unproven call tx from initial states without private state', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.unprovenTx).toBeDefined();
      expect(result.private.newCoins).toBeDefined();
    });

    it('carries the transaction it built as an unproven v9 handle around that same transaction', async () => {
      const built = Transaction.fromParts('undeployed');
      vi.mocked(createUnprovenLedgerCallTx).mockReturnValueOnce(built);
      const options = createMockCallOptions({ initialContractState: await getInitialContractState() });

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      );

      expect(LedgerTransaction.isLedgerTransaction(result.private.unprovenTx)).toBe(true);
      expect({ era: result.private.unprovenTx.era, stage: result.private.unprovenTx.stage }).toEqual({
        era: 'v9',
        stage: 'Unproven'
      });
      expect(LedgerTransaction.unwrap(result.private.unprovenTx, 'v9')).toBe(built);
    });

    it('should create unproven call tx from initial states with private state', async () => {
      const options = createMockCallOptionsWithPrivateState({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.nextPrivateState).toEqual({ test: 'next-private-state' });
    });

    it('forwards the executor log events onto the public result as logEvents (empty when the circuit emits no logs)', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result.public.logEvents).toEqual([]);
    });

    it('publishes the post-call state as an ENCODED value beside the handle, as the retained era does', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      );

      // The handle is valid only inside this process; the encoded form is the
      // one that survives a `structuredClone`, a worker transfer and storage,
      // and it is pinned identical across the ledger runtimes -- so it is the
      // member era-agnostic code can read in either era. Asserting it EQUALS
      // the handle's own encoding is the point: a second, independently
      // derived value could disagree with the state actually published.
      expect(result.public.nextContractStateEncoded).toEqual(result.public.nextContractState.encode());
    });

    const BLOCK_HASH = 'ab'.repeat(32);

    it('pins the call to the block without enabling callees when no module provider is given', async () => {
      // Arrange
      const seen: CircuitContext[] = [];
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) }),
        initialContractState: await getInitialContractState()
      });

      // Act
      await createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, createMockEncryptionPublicKey(), {
        publicDataProvider: createMockProviders().publicDataProvider,
        blockHash: BLOCK_HASH
      });

      // Assert
      expect(seen).toHaveLength(1);
      expect(seen[0]!.callContext.parentBlockHash).toBe(BLOCK_HASH);
      expect(seen[0]!.stateProvider).toBeUndefined();
      expect(seen[0]!.moduleProvider).toBeUndefined();
    });

    it('hands the callee state and module providers to the runtime together when a module provider is given', async () => {
      // Arrange
      const seen: CircuitContext[] = [];
      const stateProvider: ContractStateProvider = { getContractState: vi.fn() };
      const moduleProvider: ContractModuleProvider = { resolve: vi.fn() };
      vi.mocked(makeCalleeStateResolver).mockReturnValueOnce({
        stateProvider,
        resolvedStates: new Map(),
        blockHash: BLOCK_HASH
      });
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) }),
        initialContractState: await getInitialContractState()
      });

      // Act
      await createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, createMockEncryptionPublicKey(), {
        publicDataProvider: createMockProviders().publicDataProvider,
        blockHash: BLOCK_HASH,
        moduleProvider
      });

      // Assert
      expect(seen).toHaveLength(1);
      expect(seen[0]!.callContext.parentBlockHash).toBe(BLOCK_HASH);
      expect(seen[0]!.stateProvider).toBe(stateProvider);
      expect(seen[0]!.moduleProvider).toBe(moduleProvider);
    });

    it('should fail when circuit fails at runtime', async () => {
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({
          testCircuit: createFailingCircuit('FAIL')
        }),
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const act = () =>
        createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, walletEncryptionPublicKey);

      await expect(act()).rejects.toThrow(ContractExecutionError);
      await expect(act()).rejects.toThrow('failed assert: FAIL');
    });

    it('refuses a circuit id the compiled contract does not declare as InvalidArgumentError', async () => {
      const options = createMockCallOptions({
        circuitId: 'notACircuit',
        initialContractState: await getInitialContractState()
      });

      const rejection = createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      );

      await expect(rejection).rejects.toBeInstanceOf(InvalidArgumentError);
      await expect(rejection).rejects.toMatchObject({
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: "Circuit 'notACircuit' is undefined"
      });
    });

    it('rejects an invalid TTL before running the circuit', async () => {
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({
          testCircuit: createFailingCircuit('FAIL')
        }),
        initialContractState: await getInitialContractState(),
        config: { networkId: 'preview', ttlSeconds: 0 }
      });

      await expect(createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      )).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('createUnprovenCallTxFromInitialStates takes the states a read returns', () => {
    const ledger9Read = async () =>
      publicStatesRead({
        zswapChainState: new ZswapChainState(),
        ledgerParameters: LedgerParameters.initialParameters(),
        contractState: await getInitialContractState()
      });

    const fromAnotherTypesCopy = (state: { readonly era: 'v8' | 'v9'; serialize(): Uint8Array }) => ({
      era: state.era,
      serialize: () => state.serialize()
    });

    const recordingContract = (seen: CircuitContext[]) =>
      createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) });

    const refusalOf = async (overrides: Record<string, unknown>, seen: CircuitContext[]): Promise<unknown> => {
      const options = { ...createMockCallOptions({ compiledContract: recordingContract(seen) }), ...overrides };
      try {
        await Reflect.apply(createUnprovenCallTxFromInitialStates, undefined, [
          createMockZKConfigProvider(),
          options,
          createMockEncryptionPublicKey()
        ]);
      } catch (error: unknown) {
        return error;
      }
      throw new Error('expected the call to be refused');
    };

    it('runs the circuit on the fields a PublicDataProvider read returns, without the caller decoding them', async () => {
      // Arrange
      const seen: CircuitContext[] = [];
      const read = await ledger9Read();
      const options = createMockCallOptions({
        compiledContract: recordingContract(seen),
        initialContractState: read.contractState,
        initialZswapChainState: read.zswapChainState,
        ledgerParameters: read.ledgerParameters
      });

      // Act
      const result = await createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, createMockEncryptionPublicKey());

      // Assert
      expect(seen).toHaveLength(1);
      expect(result.private.unprovenTx.era).toBe('v9');
    });

    it('accepts states made by a second installed copy of the types package', async () => {
      const read = await ledger9Read();
      const options = {
        ...createMockCallOptions(),
        initialContractState: fromAnotherTypesCopy(read.contractState),
        initialZswapChainState: fromAnotherTypesCopy(read.zswapChainState),
        ledgerParameters: fromAnotherTypesCopy(read.ledgerParameters)
      };

      const result: unknown = await Reflect.apply(createUnprovenCallTxFromInitialStates, undefined, [
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      ]);

      expect(result).toMatchObject({ era: 'v9', private: { unprovenTx: { era: 'v9' } } });
    });

    it('refuses a contract state written by the v8 ledger before running the circuit', async () => {
      const seen: CircuitContext[] = [];
      const v8State = SerializedContractState.fromBytes('v8', new TextEncoder().encode(`${LEDGER_STATE_TAGS.ContractState.v8}:body`));

      const error = await refusalOf({ initialContractState: v8State }, seen);

      expect(error).toBeInstanceOf(EraMismatchError);
      expect(error).toMatchObject({ reason: 'ledger8-contract-state-unsupported' });
      expect(seen).toHaveLength(0);
    });

    it.each([
      ['ledgerParameters', () => SerializedLedgerParameters.fromBytes('v8', new TextEncoder().encode(`${LEDGER_STATE_TAGS.LedgerParameters.v8}:body`))],
      ['initialZswapChainState', () => SerializedZswapChainState.fromBytes('v8', new ZswapChainState().serialize())]
    ] as const)('refuses %s written by the v8 ledger before running the circuit', async (field, make) => {
      const seen: CircuitContext[] = [];

      const error = await refusalOf({ [field]: make() }, seen);

      expect(error).toBeInstanceOf(InvalidArgumentError);
      expect(error).toMatchObject({ code: COMMON_ERROR_CODES.INVALID_ARGUMENT });
      expect(String(error)).toContain(`options.${field}`);
      expect(seen).toHaveLength(0);
    });

    it.each(['initialContractState', 'initialZswapChainState', 'ledgerParameters'])(
      'refuses a decoded object in place of %s before running the circuit',
      async (field) => {
        const seen: CircuitContext[] = [];

        const error = await refusalOf({ [field]: LedgerParameters.initialParameters() }, seen);

        expect(error).toBeInstanceOf(InvalidArgumentError);
        expect(String(error)).toContain(`options.${field}`);
        expect(seen).toHaveLength(0);
      }
    );

    it('refuses a state of another kind before running the circuit', async () => {
      const seen: CircuitContext[] = [];
      const read = await ledger9Read();

      const error = await refusalOf({ initialContractState: read.ledgerParameters }, seen);

      expect(error).toBeInstanceOf(InvalidSerializedStateError);
      expect(error).toMatchObject({ kind: 'ContractState', reason: 'tag-mismatch' });
      expect(seen).toHaveLength(0);
    });

    it('refuses forged bytes behind a valid tag with a coded error before running the circuit', async () => {
      const seen: CircuitContext[] = [];
      const forged = SerializedContractState.fromBytes('v9', new TextEncoder().encode(`${LEDGER_STATE_TAGS.ContractState.v9}:forged`));

      const error = await refusalOf({ initialContractState: forged }, seen);

      expect(error).toBeInstanceOf(MidnightJsError);
      expect(seen).toHaveLength(0);
    });
  });

  describe('createUnprovenCallTx', () => {
    it('decodes a Bech32m wallet key with providers.config.networkId', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState()))
      });
      const walletProvider = { ...createMockProviders().walletProvider, getCoinPublicKey: () => BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY };
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider,
        config: { networkId: 'preview', ttlSeconds: 60 }
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow('Expected preview address, got undeployed one');
    });

    it('hands the transaction context to the ledger 9 function, which looks up the scope states', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState()))
      });
      const providers = { ...createMockProviders(), config: { networkId: 'preview', ttlSeconds: 60 } };
      const transactionContext = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers, undefined);
      const lookUpScopeStates = vi.spyOn(transactionContext, GetCurrentStatesForIdentity);
      const options = {
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await createUnprovenCallTx(providers, options, transactionContext).catch(() => undefined);

      expect(lookUpScopeStates).toHaveBeenCalledTimes(1);
    });

    it('runs the second call of a scope on the state the first left, pinned to the block of the first read', async () => {
      // Arrange
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates).mockClear();
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState()))
      });
      const providers = { ...createMockProviders(), config: { networkId: 'preview', ttlSeconds: 60 } };
      const seen: CircuitContext[] = [];
      const options = {
        compiledContract: createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) }),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };
      const scope = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers, undefined);
      const runningState = StateValue.newArray();

      // Act
      const first = await createUnprovenCallTx(providers, options, scope);
      scope[MergeUnsubmittedCallTxData]('testCircuit', { ...first, public: { ...first.public, nextContractState: runningState } });
      await createUnprovenCallTx(providers, options, scope);

      // Assert
      expect(seen).toHaveLength(2);
      const stateSeenBySecondCall = Object.values(seen[1]!.queryContexts)[0]!.state.state;
      expect(stateSeenBySecondCall.encode()).toEqual(runningState.encode());
      expect(seen[1]!.callContext.parentBlockHash).toBe(seen[0]!.callContext.parentBlockHash);
      expect(getPublicStates).toHaveBeenCalledTimes(1);
      expect(providers.publicDataProvider.queryBlock).toHaveBeenCalledTimes(1);
      const current = scope.getCurrentStates();
      expect(current?.contractState.deserialize({ v9: ContractState }).data.state.encode()).toEqual(runningState.encode());
    });

    it('refuses a transaction context that no scope made, before reading chain state', async () => {
      const providers = { ...createMockProviders(), config: { networkId: 'preview', ttlSeconds: 60 } };
      const scopeContext = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(providers, undefined);
      const handMade = {
        [TypeId]: scopeContext[TypeId],
        getAdditionalMappings: () => undefined,
        getCurrentStates: () => undefined,
        getLastUnsubmittedCallTxDataToTransact: () => undefined
      };
      const options = {
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const rejection: unknown = await Reflect.apply(createUnprovenCallTx, undefined, [providers, options, handMade]).catch(
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(InvalidArgumentError);
      expect(String(rejection)).toContain('withContractScopedTransaction');
      expect(providers.publicDataProvider.queryBlock).not.toHaveBeenCalled();
    });

    it('refuses a missing providers.config before reading chain state', async () => {
      const publicDataProvider = createMockProviders().publicDataProvider;
      const providers = Object.assign(
        {
          zkConfigProvider: createMockZKConfigProvider(),
          publicDataProvider,
          walletProvider: createMockProviders().walletProvider,
          config: MOCK_CONFIG
        },
        { config: undefined }
      );
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow(/^providers\.config is missing/);
      expect(publicDataProvider.queryBlock).not.toHaveBeenCalled();
    });

    it('rejects an invalid TTL before reading chain state', async () => {
      const { getPublicStates } = await import('../get-states');
      const publicDataProvider = createMockProviders().publicDataProvider;
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: { networkId: 'preview', ttlSeconds: 0 }
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };
      vi.mocked(getPublicStates).mockClear();

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow(InvalidArgumentError);
      expect(publicDataProvider.queryBlock).not.toHaveBeenCalled();
      expect(getPublicStates).not.toHaveBeenCalled();
    });

    it('throws when the latest block cannot be fetched from the public data provider', async () => {
      const publicDataProvider = createMockProviders().publicDataProvider;
      publicDataProvider.queryBlock = vi.fn().mockResolvedValue(null);

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const rejection = createUnprovenCallTx(providers, options);

      await expect(rejection).rejects.toBeInstanceOf(NetworkVersionReadFailedError);
      await expect(rejection).rejects.toMatchObject({
        code: CONTRACTS_ERROR_CODES.NETWORK_VERSION_READ_FAILED,
        category: 'TRANSIENT',
        message: 'Failed to fetch the latest block from the public data provider'
      });
    });

    it('refuses a circuit id the compiled contract does not declare before reading chain state', async () => {
      const publicDataProvider = createMockProviders().publicDataProvider;
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'notACircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const rejection = createUnprovenCallTx(providers, options);

      await expect(rejection).rejects.toBeInstanceOf(InvalidArgumentError);
      await expect(rejection).rejects.toMatchObject({
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: "Circuit 'notACircuit' is undefined"
      });
      expect(publicDataProvider.queryBlock).not.toHaveBeenCalled();
    });

    it('should create unproven call tx without private state provider', async () => {
      const { getPublicStates } = await import('../get-states');
      const mockGetPublicStates = vi.mocked(getPublicStates, { partial: true });

      mockGetPublicStates.mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState()))
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const result = await createUnprovenCallTx(providers, options);

      expect(LedgerTransaction.isLedgerTransaction(result.private.unprovenTx)).toBe(true);
      expect(result.private.unprovenTx.era).toBe('v9');
      expect(mockGetPublicStates).toHaveBeenCalledWith(
        providers.publicDataProvider,
        options.contractAddress,
        '00'.repeat(32)
      );
    });

    it('refuses a contract whose public state was written by the v8 ledger', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates).mockResolvedValue(publicStatesReadStub('v8'));
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const rejection = createUnprovenCallTx(providers, options);

      await expect(rejection).rejects.toBeInstanceOf(EraMismatchError);
      await expect(rejection).rejects.toMatchObject({
        reason: 'ledger8-contract-state-unsupported', code: 'MIDNIGHT_JS_C_ERA_MISMATCH',
        message: expect.stringContaining(options.contractAddress)
      });
    });

    it('refuses a contract whose public state was written by the v8 ledger, with a private state', async () => {
      const { getStates } = await import('../get-states');
      vi.mocked(getStates).mockResolvedValue({
        ...publicStatesReadStub('v8'),
        privateState: { test: 'private-state' }
      });
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        privateStateProvider: createMockProviders().privateStateProvider,
        config: MOCK_CONFIG
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        privateStateId: createMockPrivateStateId(),
        args: ['test-arg']
      };

      const rejection = createUnprovenCallTx(providers, options);

      await expect(rejection).rejects.toBeInstanceOf(EraMismatchError);
      await expect(rejection).rejects.toMatchObject({
        reason: 'ledger8-contract-state-unsupported', code: 'MIDNIGHT_JS_C_ERA_MISMATCH',
        message: expect.stringContaining(options.contractAddress)
      });
    });

    it('should create unproven call tx with private state provider', async () => {
      const { getStates } = await import('../get-states');
      const mockGetStates = vi.mocked(getStates, { partial: true });

      mockGetStates.mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState())),
        privateState: { test: 'private-state' }
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        privateStateProvider: createMockProviders().privateStateProvider,
        config: MOCK_CONFIG
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        privateStateId: createMockPrivateStateId(),
        args: ['test-arg']
      };

      const result = await createUnprovenCallTx(providers, options);

      expect(result).toBeDefined();
      expect(mockGetStates).toHaveBeenCalledWith(
        providers.publicDataProvider,
        providers.privateStateProvider,
        options.contractAddress,
        options.privateStateId,
        '00'.repeat(32)
      );
    });

    it('forwards providers.config to the ledger builder', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        ...(await ledger9StatesDecodingTo(await getInitialContractState()))
      });
      const config = { networkId: 'preview', ttlSeconds: 45 };
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await createUnprovenCallTx(providers, options);

      expect(vi.mocked(createUnprovenLedgerCallTx)).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        config
      );
    });
  });
});
