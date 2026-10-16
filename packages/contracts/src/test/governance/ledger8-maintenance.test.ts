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

/**
 * Contract maintenance through a retained-era artifact on a pre-fork head.
 *
 * The engine is doubled, as in `../v8-native.test.ts`: what it builds is tested in
 * `packages/protocol`. Everything else is real -- the retained era facade decodes the committed
 * state, and the contract is the real generated artifact -- so these tests pin what this package
 * adds: the era gate, the key read, the slot checks, the provider chain, the record check, and the
 * key store after a replacement.
 */
import { readFileSync } from 'node:fs';

import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import {
  loadLedger8Protocol,
  MaintenanceAuthorityMismatchError
} from '@midnight-ntwrk/midnight-js-protocol';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  FailFallible,
  type RawContractState,
  type VerifierKey,
  type VersionedTransaction,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BlankVerifierKeySlotError,
  Ledger8MaintenanceOnLedger9Error,
  Ledger8SigningKeyNotStoredError,
  Ledger8SigningKeyUnavailableError,
  Ledger8SigningKeyUnusableError
} from '../../errors';
import {
  Ledger8InsertVerifierKeyTxFailedError,
  Ledger8RemoveVerifierKeyTxFailedError,
  Ledger8ReplaceMaintenanceAuthorityTxFailedError
} from '../../governance/errors';
import { submitInsertVerifierKeyTx } from '../../governance/submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from '../../governance/submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from '../../governance/submit-replace-authority-tx';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from '../../governance/tx-interfaces';
import type { Ledger8ContractProviders } from '../../ledger8-contract';
import type { CoinReceiver016Contract, CoinReceiver016Module } from '../ledger8-fixture-types';
import { hfFixturePath, readHfHexFixture } from '../ledger8-replay';
import { createMockFinalizedTxData, createMockLedger8FinalizedTxData, createMockProviders } from '../test-mocks';

vi.mock('@midnight-ntwrk/compact-runtime', () => import('../ledger8-runtime-stub'));

const engineSlot = vi.hoisted((): { engine?: unknown } => ({}));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return {
    ...actual,
    loadLedger8Engine: (): Promise<unknown> =>
      engineSlot.engine === undefined
        ? Promise.reject(new Error('no engine installed for this test'))
        : Promise.resolve(engineSlot.engine)
  };
});

const CIRCUIT_ID = 'receive_coin';
const CONTRACT_ADDRESS = 'ab'.repeat(32);
const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;
const COMPOSED = Uint8Array.from([0x6d, 0x61, 0x69, 0x6e]);
const COIN_PUBLIC_KEY = 'cd'.repeat(32);
const STORED_KEY: SigningKey = { tag: 'schnorr', value: '11'.repeat(32) };
const NEW_KEY: SigningKey = { tag: 'schnorr', value: '22'.repeat(32) };
const NEW_VK = Uint8Array.from(
  readFileSync(hfFixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
) as VerifierKey;

type Providers = Ledger8ContractProviders<CoinReceiver016Contract, typeof CIRCUIT_ID>;

describe('contract maintenance through a retained-era artifact', () => {
  let contract: CoinReceiver016Contract;
  let keyedState: Uint8Array;
  let blankState: Uint8Array;
  let emptyState: Uint8Array;
  let retainedLedgerParameters: Uint8Array;
  let composeMaintenanceTx: ReturnType<typeof vi.fn>;

  const rawState = (raw: Uint8Array, protocolVersion = PRE_FORK_PROTOCOL_VERSION): RawContractState => ({
    version: protocolVersion === PRE_FORK_PROTOCOL_VERSION ? 'v8' : 'v9',
    protocolVersion,
    raw,
    ledgerParameters: retainedLedgerParameters
  });

  const providersOn = (state: Uint8Array, protocolVersion = PRE_FORK_PROTOCOL_VERSION): Providers => {
    const zkConfigProvider: ZKConfigProvider<typeof CIRCUIT_ID> = {
      getArtifactRuntimeVersion: vi.fn().mockResolvedValue('0.16.0'),
      getVerifierKeys: vi.fn(),
      getZKIR: vi.fn(),
      getProverKey: vi.fn(),
      getVerifierKey: vi.fn(),
      get: vi.fn(),
      asKeyMaterialProvider: vi.fn()
    };
    const providers: Providers = { ...createMockProviders(), zkConfigProvider };
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(protocolVersion);
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue(rawState(state, protocolVersion));
    providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockLedger8FinalizedTxData());
    providers.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(STORED_KEY);
    providers.walletProvider.getCoinPublicKey = (): string => COIN_PUBLIC_KEY;
    providers.privateStateProvider.setSigningKey = vi.fn().mockResolvedValue(undefined);
    providers.proofProvider.proveTx = vi.fn().mockImplementation((tx: VersionedTransaction<unknown>) => Promise.resolve(tx));
    providers.walletProvider.balanceTx = vi.fn().mockImplementation((tx: VersionedTransaction<unknown>) => Promise.resolve(tx));
    providers.midnightProvider.submitTx = vi.fn().mockResolvedValue('maintenance-tx-id');
    return providers;
  };

  beforeAll(async () => {
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
    const v8 = await loadLedger8Protocol();
    retainedLedgerParameters = v8.LedgerParameters.initialParameters().serialize();
    keyedState = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const blank = v8.ContractState.deserialize(keyedState);
    blank.setOperation(CIRCUIT_ID, new v8.ContractOperation());
    blankState = blank.serialize();
    const empty = new v8.ContractState();
    empty.data = blank.data;
    emptyState = empty.serialize();
  });

  beforeEach(() => {
    composeMaintenanceTx = vi.fn().mockResolvedValue(COMPOSED);
    engineSlot.engine = { composeMaintenanceTx };
  });

  describe('happy paths', () => {
    it('inserts a verifier key into an empty slot and answers with the ledger 8 record', async () => {
      const providers = providersOn(blankState);

      const result = await submitInsertVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID, NEW_VK);

      expect(composeMaintenanceTx).toHaveBeenCalledWith({
        contract,
        contractAddress: CONTRACT_ADDRESS,
        contractStateBytes: blankState,
        coinPublicKey: COIN_PUBLIC_KEY,
        signingKey: STORED_KEY.value,
        networkId: providers.config.networkId,
        ttl: expect.anything(),
        update: { kind: 'insert-verifier-key', circuitId: CIRCUIT_ID, verifierKey: NEW_VK }
      });
      expect(providers.proofProvider.proveTx).toHaveBeenCalledWith({ version: 'v8', txBytes: COMPOSED });
      expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('maintenance-tx-id');
      expect(result).toEqual({ era: 'v8', public: createMockLedger8FinalizedTxData() });
    });

    it('inserts a verifier key for a circuit a removal took off the state', async () => {
      const providers = providersOn(emptyState);

      const result = await submitInsertVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID, NEW_VK);

      expect(composeMaintenanceTx).toHaveBeenCalledWith(expect.objectContaining({ contractStateBytes: emptyState }));
      expect(result.era).toBe('v8');
    });

    it('removes the verifier key a slot holds', async () => {
      const providers = providersOn(keyedState);

      const result = await submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID);

      expect(composeMaintenanceTx).toHaveBeenCalledWith(
        expect.objectContaining({
          contractStateBytes: keyedState,
          update: { kind: 'remove-verifier-key', circuitId: CIRCUIT_ID }
        })
      );
      expect(result).toEqual({ era: 'v8', public: createMockLedger8FinalizedTxData() });
    });

    it('replaces the authority and stores the new key only after the chain recorded it', async () => {
      const providers = providersOn(keyedState);

      const result = await submitReplaceAuthorityTx(providers, contract, CONTRACT_ADDRESS)(NEW_KEY);

      expect(composeMaintenanceTx).toHaveBeenCalledWith(
        expect.objectContaining({
          signingKey: STORED_KEY.value,
          update: { kind: 'replace-authority', newSigningKey: NEW_KEY.value }
        })
      );
      expect(providers.privateStateProvider.setSigningKey).toHaveBeenCalledWith(CONTRACT_ADDRESS, NEW_KEY);
      expect(vi.mocked(providers.privateStateProvider.setSigningKey).mock.invocationCallOrder[0]).toBeGreaterThan(
        vi.mocked(providers.publicDataProvider.watchForTxData).mock.invocationCallOrder[0]!
      );
      expect(result).toEqual({ era: 'v8', public: createMockLedger8FinalizedTxData() });
    });

    it('builds handles keyed by the circuits the artifact declares, routed through the retained pipeline', async () => {
      const providers = providersOn(keyedState);

      const circuits = createCircuitMaintenanceTxInterfaces(providers, contract, CONTRACT_ADDRESS);
      const removed = await circuits[CIRCUIT_ID].removeVerifierKey();
      const replaced = await createContractMaintenanceTxInterface(providers, contract, CONTRACT_ADDRESS).replaceAuthority(
        NEW_KEY
      );

      expect(Object.keys(circuits)).toEqual(Object.keys(contract.provableCircuits));
      expect([removed.era, replaced.era]).toEqual(['v8', 'v8']);
      expect(composeMaintenanceTx).toHaveBeenCalledTimes(2);
    });
  });

  describe('refusals before anything is composed', () => {
    it('refuses an insert into a slot that already holds a key', async () => {
      const providers = providersOn(keyedState);

      await expect(
        submitInsertVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID, NEW_VK)
      ).rejects.toThrow(InvalidArgumentError);
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('refuses a remove from a slot that holds no key', async () => {
      const providers = providersOn(blankState);

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toThrow(
        BlankVerifierKeySlotError
      );
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('refuses a remove for a circuit the state does not declare', async () => {
      const providers = providersOn(emptyState);

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toThrow(
        /not found for contract/
      );
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('refuses a circuit the artifact does not declare, before the head is read', async () => {
      const providers = providersOn(keyedState);

      await expect(
        submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, 'no_such_circuit' as typeof CIRCUIT_ID)
      ).rejects.toThrow(InvalidArgumentError);
      expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    });

    it('refuses a post-fork head with the recompile remediation, before the key is read', async () => {
      const providers = providersOn(keyedState, POST_FORK_PROTOCOL_VERSION);

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toThrow(
        Ledger8MaintenanceOnLedger9Error
      );
      expect(providers.privateStateProvider.getSigningKey).not.toHaveBeenCalled();
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('refuses an ecdsa replacement key before the head is read', async () => {
      const providers = providersOn(keyedState);

      await expect(
        submitReplaceAuthorityTx(providers, contract, CONTRACT_ADDRESS)({ tag: 'ecdsa', value: NEW_KEY.value })
      ).rejects.toThrow(Ledger8SigningKeyUnusableError);
      expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
      expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
    });

    it.each([
      ['nothing is stored', (): Promise<SigningKey | null> => Promise.resolve(null)],
      ['an ecdsa key is stored', (): Promise<SigningKey> => Promise.resolve({ tag: 'ecdsa', value: STORED_KEY.value })],
      ['a truncated key is stored', (): Promise<SigningKey> => Promise.resolve({ tag: 'schnorr', value: '11'.repeat(31) })]
    ])('refuses when %s', async (_case, read) => {
      const providers = providersOn(keyedState);
      providers.privateStateProvider.getSigningKey = vi.fn(read);

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toThrow(
        Ledger8SigningKeyUnavailableError
      );
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('refuses when the store cannot be read, carrying the read failure', async () => {
      const providers = providersOn(keyedState);
      const readFailure = new Error('wrong store password');
      providers.privateStateProvider.getSigningKey = vi.fn().mockRejectedValue(readFailure);

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toMatchObject({
        name: 'Ledger8SigningKeyUnavailableError',
        cause: readFailure
      });
      expect(composeMaintenanceTx).not.toHaveBeenCalled();
    });

    it('lets a foreign key refusal through before anything is proven', async () => {
      const providers = providersOn(keyedState);
      composeMaintenanceTx.mockRejectedValue(new MaintenanceAuthorityMismatchError('v8', CONTRACT_ADDRESS));

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toThrow(
        MaintenanceAuthorityMismatchError
      );
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    });
  });

  describe('refusals after submission', () => {
    it.each([
      [
        'an insert',
        (providers: Providers) => submitInsertVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID, NEW_VK),
        Ledger8InsertVerifierKeyTxFailedError,
        true
      ],
      [
        'a remove',
        (providers: Providers) => submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID),
        Ledger8RemoveVerifierKeyTxFailedError,
        false
      ],
      [
        'a replacement',
        (providers: Providers) => submitReplaceAuthorityTx(providers, contract, CONTRACT_ADDRESS)(NEW_KEY),
        Ledger8ReplaceMaintenanceAuthorityTxFailedError,
        false
      ]
    ] as const)('refuses %s the chain recorded as failed, carrying the record', async (_case, run, errorClass, blank) => {
      const providers = providersOn(blank ? blankState : keyedState);
      providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockLedger8FinalizedTxData(FailFallible));

      const failure = await run(providers).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(errorClass);
      expect(failure).toMatchObject({ record: createMockLedger8FinalizedTxData(FailFallible) });
      expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
    });

    it('refuses a record the ledger 9 era recorded', async () => {
      const providers = providersOn(keyedState);
      providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());

      await expect(submitRemoveVerifierKeyTx(providers, contract, CONTRACT_ADDRESS, CIRCUIT_ID)).rejects.toMatchObject({
        name: 'EraInvariantViolationError'
      });
    });

    it('hands back the new key when the store refuses it after a confirmed replacement', async () => {
      const providers = providersOn(keyedState);
      const storeFailure = new Error('disk full');
      providers.privateStateProvider.setSigningKey = vi.fn().mockRejectedValue(storeFailure);

      const failure = await submitReplaceAuthorityTx(providers, contract, CONTRACT_ADDRESS)(NEW_KEY).catch(
        (error: unknown) => error
      );

      expect(failure).toBeInstanceOf(Ledger8SigningKeyNotStoredError);
      expect(failure).toMatchObject({ contractAddress: CONTRACT_ADDRESS, signingKey: NEW_KEY, cause: storeFailure });
      expect((failure as Error).message).not.toContain(NEW_KEY.value);
    });
  });
});
