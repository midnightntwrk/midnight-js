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

import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import { type EncodedStateValue, loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import {
  FailEntirely,
  type FinalizedTx,
  LedgerTransaction,
  type PrivateStateId,
  SerializedLedgerParameters,
  type TxStatus,
  type UnboundTx,
  type UnprovenTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EraMismatchError, ScopedTransactionIdentityMismatchError, TxFailedError } from '../errors';
import { composeLedger8Call, type Ledger8CallPipelineResult, type Ledger8Snapshot, readLedger8Snapshot } from '../internal/ledger8-pipeline';
import type {
  Ledger8CircuitContext,
  Ledger8CircuitResult,
  Ledger8Contract,
  Ledger8ContractProviders
} from '../ledger8-contract';
import { submitCallTx } from '../submit-call-tx';
import {
  isLedger8TransactionContext,
  isLedger9TransactionContext,
  type Ledger8TransactionContext,
  withContractScopedTransaction,
  withLedger8ContractScopedTransaction,
  withLedger9ContractScopedTransaction
} from '../transaction';
import { createCircuitCallTxInterface } from '../tx-interfaces';
import { createUnprovenCallTx } from '../unproven-call-tx';
import { finalizedLike, unboundLike } from './ledger-transaction-fixtures';
import {
  contractStatesOf,
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContractAddress,
  createMockEncryptionPublicKey,
  createMockLedger8FinalizedTxData,
  createMockProviders
} from './test-mocks';

const eraLoadSlot = vi.hoisted((): { readonly acquired: string[] } => ({ acquired: [] }));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return {
    ...actual,
    loadLedger8Engine: (): Promise<unknown> => Promise.resolve({}),
    loadLedgerEra: (version: Protocol.LedgerEra): Promise<Protocol.LedgerEraFacade> => {
      eraLoadSlot.acquired.push(version);
      return actual.loadLedgerEra(version);
    }
  };
});

// Replaced whole, without `importOriginal`: the original module reaches `ledger8-entry` through
// `verifier-key` and `find-deployed-contract`, which would bind `ledger8-entry` to the unmocked copy.
vi.mock('../internal/ledger8-pipeline', () => ({ readLedger8Snapshot: vi.fn(), composeLedger8Call: vi.fn() }));

const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;
const VERIFIER_KEY = new Uint8Array([1, 2, 3]);
const PRIVATE_STATE_ID: PrivateStateId = 'scope-private-state';

const noopCircuit = (context: Ledger8CircuitContext): Ledger8CircuitResult => {
  throw new Error(`the composer is mocked, so no circuit runs (${String(context.currentPrivateState)})`);
};

interface RetainedContract extends Ledger8Contract {
  readonly provableCircuits: { readonly first: typeof noopCircuit; readonly second: typeof noopCircuit };
}

const retainedContract: RetainedContract = {
  witnesses: {},
  circuits: { first: noopCircuit, second: noopCircuit },
  impureCircuits: { first: noopCircuit, second: noopCircuit },
  provableCircuits: { first: noopCircuit, second: noopCircuit },
  initialState: () => {
    throw new Error('not deployed in these tests');
  }
};

type RetainedCircuit = keyof RetainedContract['provableCircuits'];

const stateMarker = (length: number): EncodedStateValue => ({
  tag: 'array',
  content: Array.from({ length }, (): EncodedStateValue => ({ tag: 'null' }))
});

const INITIAL_STATE = stateMarker(1);
const postStateOf = (circuitId: string): EncodedStateValue => stateMarker(circuitId === 'first' ? 2 : 3);

interface Seen {
  proveTx?: UnprovenTx;
}

const retainedProviders = async (
  protocolVersion = PRE_FORK_PROTOCOL_VERSION,
  status: TxStatus = 'SucceedEntirely'
): Promise<{ providers: Ledger8ContractProviders<RetainedContract, RetainedCircuit>; seen: Seen }> => {
  const base = createMockProviders();
  const seen: Seen = {};
  base.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(protocolVersion);
  base.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue({
    ...createMockLedger8FinalizedTxData(status),
    protocolVersion
  });
  base.proofProvider.proveTx = vi.fn().mockImplementation(async (tx: UnprovenTx) => {
    seen.proveTx = tx;
    return unboundLike(tx);
  });
  base.walletProvider.balanceTx = vi.fn().mockImplementation((tx: UnboundTx): Promise<FinalizedTx> => finalizedLike(tx));
  base.midnightProvider.submitTx = vi.fn().mockResolvedValue('scope-tx-id');
  contractStatesOf(base.privateStateProvider).get.mockResolvedValue('stored-private-state');
  const zkConfigProvider: ZKConfigProvider<RetainedCircuit> = {
    getArtifactRuntimeVersion: vi.fn().mockResolvedValue('0.16.0'),
    getVerifierKeys: vi.fn(),
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn().mockResolvedValue(VERIFIER_KEY),
    get: vi.fn(),
    asKeyMaterialProvider: vi.fn()
  };
  const providers: Ledger8ContractProviders<RetainedContract, RetainedCircuit> = { ...base, zkConfigProvider };
  return { providers, seen };
};

const snapshotOf = async (): Promise<Ledger8Snapshot> => ({
  state: {
    raw: new Uint8Array([9]),
    ledgerParameters: SerializedLedgerParameters.fromBytes(
      'v8',
      (await loadLedger8Protocol()).LedgerParameters.initialParameters().serialize()
    )
  },
  encoded: INITIAL_STATE,
  decoded: { state: INITIAL_STATE, balance: new Map(), entryPoints: [] },
  stateEra: 'v8'
});

const intentTxOf = async (): Promise<UnprovenTx> => {
  const v8 = await loadLedger8Protocol();
  return LedgerTransaction.seal(
    'v8',
    'Unproven',
    v8.Transaction.fromPartsRandomized('undeployed', undefined, undefined, v8.Intent.new(new Date(Date.now() + 600_000)))
  );
};

const composedFor = async (circuitId: string, privateState: unknown): Promise<Ledger8CallPipelineResult<unknown>> => ({
  unprovenTx: await intentTxOf(),
  circuitId,
  nextPrivateState: `${String(privateState)}+${circuitId}`,
  result: `${circuitId}-result`,
  input: { value: [], alignment: [] },
  output: { value: [], alignment: [] },
  privateTranscriptOutputs: [],
  publicTranscript: [],
  partitionedTranscript: [undefined, undefined],
  nextZswapLocalState: { coinPublicKey: '', currentIndex: 0n, inputs: [], outputs: [] },
  nextContractState: { post: circuitId },
  nextContractStateEncoded: postStateOf(circuitId),
  calls: [],
  newCoins: [],
  guaranteedZswapOfferBytes: undefined,
  fallibleZswapOfferBytes: undefined
});

const callOptions = (circuitId: RetainedCircuit, contractAddress: string) => ({
  compiledContract: retainedContract,
  contractAddress,
  circuitId,
  privateStateId: PRIVATE_STATE_ID
});

describe('a contract-scoped transaction on a pre-fork (ledger 8) network', () => {
  let contractAddress: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    eraLoadSlot.acquired.length = 0;
    contractAddress = createMockContractAddress();
    vi.mocked(readLedger8Snapshot).mockResolvedValue(await snapshotOf());
    vi.mocked(composeLedger8Call).mockImplementation((request) => composedFor(request.circuitId, request.privateState));
  });

  it('merges every call into ONE ledger 8 transaction and submits it once', async () => {
    // Arrange
    const { providers, seen } = await retainedProviders();

    // Act
    const finalized = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      await submitCallTx(providers, callOptions('second', contractAddress), txCtx);
    });

    // Assert
    expect(providers.proofProvider.proveTx).toHaveBeenCalledTimes(1);
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
    expect(seen.proveTx?.era).toBe('v8');
    const merged = seen.proveTx!.deserialize({ v8: (await loadLedger8Protocol()).Transaction });
    expect(merged.intents?.size).toBe(2);
    expect(finalized.era).toBe('v8');
    expect(finalized.circuitId).toBe('second');
    expect(finalized.public.txId).toBe('test-tx-id');
  });

  it('reads the head, the contract state and the stored private state ONCE for the whole scope', async () => {
    // Arrange
    const { providers } = await retainedProviders();

    // Act
    await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      await submitCallTx(providers, callOptions('second', contractAddress), txCtx);
    });

    // Assert
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(readLedger8Snapshot).toHaveBeenCalledTimes(1);
    expect(contractStatesOf(providers.privateStateProvider).get).toHaveBeenCalledTimes(1);
    expect(eraLoadSlot.acquired.filter((era) => era === 'v8')).toEqual(['v8', 'v8']);
  });

  it('runs each later call against the states the earlier call ended on', async () => {
    // Arrange
    const { providers } = await retainedProviders();

    // Act
    await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      await submitCallTx(providers, callOptions('second', contractAddress), txCtx);
    });

    // Assert
    const [[firstRequest, firstSnapshot], [secondRequest, secondSnapshot]] = vi.mocked(composeLedger8Call).mock.calls;
    expect(firstSnapshot?.encoded).toEqual(INITIAL_STATE);
    expect(firstRequest?.privateState).toBe('stored-private-state');
    expect(secondSnapshot?.encoded).toEqual(postStateOf('first'));
    expect(secondSnapshot?.decoded.state).toEqual(postStateOf('first'));
    expect(secondRequest?.privateState).toBe('stored-private-state+first');
  });

  it('stores the private state the LAST call ended on, once, after the chain recorded the scope', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    const privateStates = contractStatesOf(providers.privateStateProvider);

    // Act
    await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      await submitCallTx(providers, callOptions('second', contractAddress), txCtx);
    });

    // Assert
    expect(privateStates.set).toHaveBeenCalledExactlyOnceWith(PRIVATE_STATE_ID, 'stored-private-state+first+second');
  });

  it('proves, submits and stores nothing when the scope body throws', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    const failure = new Error('caller gave up');

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      throw failure;
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toBe(failure);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
    expect(contractStatesOf(providers.privateStateProvider).set).not.toHaveBeenCalled();
  });

  it('refuses a recorded failure as TxFailedError and stores no private state', async () => {
    // Arrange
    const { providers } = await retainedProviders(PRE_FORK_PROTOCOL_VERSION, FailEntirely);

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(TxFailedError);
    expect(contractStatesOf(providers.privateStateProvider).set).not.toHaveBeenCalled();
  });

  it('refuses a second contract in the same scope', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    const otherAddress = createMockContractAddress();

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
      await submitCallTx(providers, callOptions('second', otherAddress), txCtx);
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(ScopedTransactionIdentityMismatchError);
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('builds a call with createUnprovenCallTx against the scope states without merging it', async () => {
    // Arrange
    const { providers } = await retainedProviders();

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      const built = await createUnprovenCallTx(providers, callOptions('first', contractAddress), txCtx);
      expect(built.era).toBe('v8');
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toHaveProperty('message', 'No calls were submitted.');
    expect(readLedger8Snapshot).toHaveBeenCalledTimes(1);
  });

  it('joins the scope through a circuit call interface given the context as its first argument', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    const recipient = createMockCoinPublicKey();
    const recipientEncryptionKey = createMockEncryptionPublicKey();
    const mappings = new Map([[recipient, recipientEncryptionKey]]);
    const callTx = createCircuitCallTxInterface(providers, retainedContract, contractAddress, PRIVATE_STATE_ID);

    // Act
    const finalized = await withLedger8ContractScopedTransaction(
      providers,
      async (txCtx) => {
        const first = await callTx.first(txCtx);
        expect(first.era).toBe('v8');
        await callTx.second(txCtx);
      },
      { additionalCoinEncPublicKeyMappings: mappings }
    );

    // Assert
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
    expect(finalized.circuitId).toBe('second');
    const [[firstRequest]] = vi.mocked(composeLedger8Call).mock.calls;
    expect(firstRequest?.encryptionPublicKey(recipient)).toBe(recipientEncryptionKey);
  });

  it('refuses a scope body that made no call', async () => {
    // Arrange
    const { providers } = await retainedProviders();

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (outer) => {
      await withLedger8ContractScopedTransaction(
        providers,
        async () => undefined,
        // @ts-expect-error the parameter is declared as options; a JavaScript caller can still pass a context
        outer
      );
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toHaveProperty('message', 'No calls were submitted.');
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('nests into a context passed as its third argument, without a head read or a submission', async () => {
    // Arrange
    const { providers } = await retainedProviders();

    // Act
    await withLedger8ContractScopedTransaction(providers, async (outer) => {
      await withLedger8ContractScopedTransaction(
        providers,
        async (inner) => {
          expect(inner).toBe(outer);
          await submitCallTx(providers, callOptions('first', contractAddress), inner);
        },
        // @ts-expect-error the parameter is declared as options; a JavaScript caller can still pass a context
        outer
      );
    });

    // Assert
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
  });
});

describe('which scope a head era gets', () => {
  let contractAddress: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    eraLoadSlot.acquired.length = 0;
    contractAddress = createMockContractAddress();
    vi.mocked(readLedger8Snapshot).mockResolvedValue(await snapshotOf());
    vi.mocked(composeLedger8Call).mockImplementation((request) => composedFor(request.circuitId, request.privateState));
  });

  it('withContractScopedTransaction runs a ledger 8 scope on a pre-fork head', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    let seen: unknown;

    // Act
    await withContractScopedTransaction(providers, async (txCtx: Ledger8TransactionContext<RetainedContract, RetainedCircuit>) => {
      seen = txCtx;
      await submitCallTx(providers, callOptions('first', contractAddress), txCtx);
    });

    // Assert
    expect(isLedger8TransactionContext(seen)).toBe(true);
    expect(isLedger9TransactionContext(seen)).toBe(false);
    expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
  });

  it('withLedger9ContractScopedTransaction refuses a pre-fork head before its body runs', async () => {
    // Arrange
    const providers = createMockProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withLedger9ContractScopedTransaction(providers, body).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(EraMismatchError);
    expect(error).toHaveProperty('reason', 'scope-era-mismatch');
    expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.ERA_MISMATCH)).toBe(true);
    expect(body).not.toHaveBeenCalled();
  });

  it('withLedger8ContractScopedTransaction refuses a post-fork head before its body runs, acquiring no era', async () => {
    // Arrange
    const { providers } = await retainedProviders(POST_FORK_PROTOCOL_VERSION);
    const body = vi.fn(async () => undefined);

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, body).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(EraMismatchError);
    expect(error).toHaveProperty('reason', 'scope-era-mismatch');
    expect((error as Error).message).toContain('withLedger8ContractScopedTransaction');
    expect((error as Error).message).toContain("'v9'");
    expect(body).not.toHaveBeenCalled();
    expect(eraLoadSlot.acquired).toEqual([]);
  });

  it('refuses a ledger 9 contract called inside a ledger 8 scope, naming the real fault', async () => {
    // Arrange
    const { providers } = await retainedProviders();
    const v9Providers = createMockProviders();
    v9Providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);

    // Act
    const error = await withLedger8ContractScopedTransaction(providers, async (txCtx) => {
      // @ts-expect-error a ledger 8 context has no ledger 9 call overload
      await submitCallTx(v9Providers, { compiledContract: createMockCompiledContract(), contractAddress, circuitId: 'testCircuit' }, txCtx);
    }).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(EraMismatchError);
    expect(error).toHaveProperty('reason', 'ledger9-artifact-on-ledger8-network');
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });
});
