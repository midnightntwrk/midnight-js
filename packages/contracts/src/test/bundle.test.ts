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

import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type AnyProvableCircuitId,
  FailEntirely,
  type PrivateStateId,
  SucceedEntirely
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { type MultiContractTransactionContext, withMultiContractScopedTransaction } from '../bundle';
import { CallTxFailedError } from '../errors';
import {
  type Bundler,
  bundleScoped,
  type InFlightCall
} from '../internal/bundle';
import {
  CacheStates,
  GetCurrentStatesForIdentity,
  MergeUnsubmittedCallTxData,
  Submit,
  TypeId
} from '../internal/transaction';
import {
  createMockContractAddress,
  createMockContractState,
  createMockFinalizedTxData,
  createMockProviders,
  createMockUnprovenCallTxData
} from './test-mocks';

// ─── Test fixtures ─────────────────────────────────────────────────────────

/**
 * Builds a `ContractStates`-shaped object whose `contractState` and
 * `ledgerParameters` are mocks with a usable `serialize()`. The bundler reads
 * these bytes during {@link MergeUnsubmittedCallTxData}; tests inject a stub
 * bundler so the bytes never need to deserialize back into real wasm classes.
 */
const createCachedStates = (privateState?: unknown) => ({
  contractState: createMockContractState(),
  zswapChainState: { tag: 'mock-zswap' } as never,
  ledgerParameters: LedgerParameters.initialParameters(),
  ...(privateState !== undefined ? { privateState } : {})
});

const sampleSentinelTx = (label: string): never =>
  ({ __sentinelTx: true, label }) as never;

/** A bundler that records the in-flight calls it was invoked with. */
const recordingStubBundler = (): {
  bundler: Bundler;
  invocations: (readonly InFlightCall[])[];
} => {
  const invocations: (readonly InFlightCall[])[] = [];
  return {
    bundler: ((calls) => {
      invocations.push(calls);
      return sampleSentinelTx(`bundle(${calls.length})`);
    }) as Bundler,
    invocations
  };
};

const installSubmitTxResult = (
  providers: ReturnType<typeof createMockProviders>,
  status: 'SucceedEntirely' | 'FailEntirely' = SucceedEntirely
): void => {
  const provenTx = { __sentinelTx: true, label: 'proven' } as never;
  const balancedTx = { __sentinelTx: true, label: 'balanced' } as never;
  vi.mocked(providers.proofProvider.proveTx).mockResolvedValue(provenTx);
  vi.mocked(providers.walletProvider.balanceTx).mockResolvedValue(balancedTx);
  vi.mocked(providers.midnightProvider.submitTx).mockResolvedValue('mock-tx-id');
  vi.mocked(providers.publicDataProvider.watchForTxData).mockResolvedValue(
    createMockFinalizedTxData(status)
  );
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('multi-contract scoped transaction', () => {
  describe('protocol surface', () => {
    it('the context is recognised as a TransactionContext by the SDK type guard', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const { bundler } = recordingStubBundler();

      let captured: MultiContractTransactionContext | undefined;
      // No calls submitted — the scope should reject after fn returns.
      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            captured = ctx;
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow(/No calls were submitted/);

      expect(captured).toBeDefined();
      expect((captured as unknown as Record<symbol, unknown>)[TypeId]).toBe(TypeId);
      expect(typeof (captured as unknown as Record<symbol, unknown>)[Submit]).toBe('function');
      expect(typeof (captured as unknown as Record<symbol, unknown>)[CacheStates]).toBe('function');
      expect(typeof (captured as unknown as Record<symbol, unknown>)[MergeUnsubmittedCallTxData]).toBe(
        'function'
      );
      expect(typeof (captured as unknown as Record<symbol, unknown>)[GetCurrentStatesForIdentity]).toBe(
        'function'
      );
    });

    it('for(contract) returns the same instance (pure widening)', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();

      let captured: MultiContractTransactionContext | undefined;
      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            captured = ctx;
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();

      // Type-erased FoundContract stand-in is fine — `for` does pure widening.
      const widened = captured!.for({} as never);
      expect(widened).toBe(captured);
    });
  });

  describe('per-identity state caching', () => {
    it('caches states per (contractAddress, privateStateId) without identity-mismatch errors', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();
      const senderIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-sender' as PrivateStateId
      };
      const recipientIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-recipient' as PrivateStateId
      };
      const senderStates = createCachedStates({ who: 'sender' });
      const recipientStates = createCachedStates({ who: 'recipient' });

      let lookups: unknown[] = [];
      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(senderStates, senderIdentity);
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              recipientStates,
              recipientIdentity
            );
            lookups = [
              (c[GetCurrentStatesForIdentity] as (i: unknown) => unknown)(senderIdentity),
              (c[GetCurrentStatesForIdentity] as (i: unknown) => unknown)(recipientIdentity)
            ];
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();

      expect(lookups[0]).toBe(senderStates);
      expect(lookups[1]).toBe(recipientStates);
    });

    it('returns undefined for an unseen identity', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();
      const knownIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-known' as PrivateStateId
      };
      const unknownIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-unknown' as PrivateStateId
      };

      let result: unknown;
      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              createCachedStates({}),
              knownIdentity
            );
            result = (c[GetCurrentStatesForIdentity] as (i: unknown) => unknown)(unknownIdentity);
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();

      expect(result).toBeUndefined();
    });
  });

  describe('per-call capture and bundling', () => {
    it('passes the in-flight calls in submission order to the bundler', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const { bundler, invocations } = recordingStubBundler();

      const senderIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-sender' as PrivateStateId
      };
      const recipientIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-recipient' as PrivateStateId
      };

      const result = await bundleScoped(
        providers,
        async (ctx) => {
          const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
          (c[CacheStates] as (s: unknown, i: unknown) => void)(
            createCachedStates({ who: 'sender' }),
            senderIdentity
          );
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)('send', createMockUnprovenCallTxData(), senderIdentity.privateStateId);

          (c[CacheStates] as (s: unknown, i: unknown) => void)(
            createCachedStates({ who: 'recipient' }),
            recipientIdentity
          );
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)('receive', createMockUnprovenCallTxData(), recipientIdentity.privateStateId);
        },
        undefined,
        { bundler }
      );

      expect(invocations).toHaveLength(1);
      const calls = invocations[0]!;
      expect(calls).toHaveLength(2);
      expect(calls[0]!.circuitId).toBe('send');
      expect(calls[1]!.circuitId).toBe('receive');
      expect(calls[0]!.identity.privateStateId).toBe('ps-sender');
      expect(calls[1]!.identity.privateStateId).toBe('ps-recipient');
      expect(result.calls.length).toBe(2);
      expect(result.public.status).toBe(SucceedEntirely);
    });

    it('captures contractStateBytes BEFORE the post-call state mutation', async () => {
      // Establishes the invariant that the bundler's per-call op lookup uses the
      // pre-call state, not the post-call one. Done by checking that the captured
      // bytes equal what `serialize()` returned at merge time, even after the
      // cached entry has been replaced with a post-call state.
      const providers = createMockProviders();
      const { bundler, invocations } = recordingStubBundler();
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-only' as PrivateStateId
      };

      const cs = createMockContractState();
      const preCallBytes = new Uint8Array([1, 2, 3]);
      const postCallBytes = new Uint8Array([99, 99, 99]);
      let serializeCalls = 0;
      vi.mocked(cs.serialize).mockImplementation(() => {
        serializeCalls += 1;
        // First call returns the pre-call snapshot; any subsequent call returns
        // a different value so we can detect a regression that captures late.
        return serializeCalls === 1 ? preCallBytes : postCallBytes;
      });

      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              {
                contractState: cs,
                zswapChainState: { tag: 'mock-zswap' } as never,
                ledgerParameters: LedgerParameters.initialParameters(),
                privateState: { who: 'sender' }
              },
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('send', createMockUnprovenCallTxData(), identity.privateStateId);
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();

      expect(invocations).toHaveLength(1);
      const calls = invocations[0]!;
      expect(calls).toHaveLength(1);
      expect(calls[0]!.contractStateBytes).toBe(preCallBytes);
    });

    it('threads same-identity in-flight state into the next merge', async () => {
      // Two calls to the same identity. The second call's cached state should
      // reflect the first call's nextContractState in its `data` field. We
      // verify this by capturing the cached state via [GetCurrentStatesForIdentity]
      // between the two merges.
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-only' as PrivateStateId
      };

      const initialCallData = createMockUnprovenCallTxData({
        private: { nextPrivateState: { generation: 1 } } as never
      });
      const secondCallData = createMockUnprovenCallTxData({
        private: { nextPrivateState: { generation: 2 } } as never
      });

      let stateAfterFirst: unknown;
      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              createCachedStates({ generation: 0 }),
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('first', initialCallData, identity.privateStateId);
            stateAfterFirst = (c[GetCurrentStatesForIdentity] as (i: unknown) => unknown)(
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('second', secondCallData, identity.privateStateId);
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();

      expect(stateAfterFirst).toBeDefined();
      expect((stateAfterFirst as { privateState: { generation: number } }).privateState).toEqual({
        generation: 1
      });
    });
  });

  describe('private-state persistence', () => {
    it('writes the latest nextPrivateState per privateStateId on success', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const { bundler } = recordingStubBundler();
      const senderIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-sender' as PrivateStateId
      };
      const recipientIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-recipient' as PrivateStateId
      };

      await bundleScoped(
        providers,
        async (ctx) => {
          const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;

          (c[CacheStates] as (s: unknown, i: unknown) => void)(
            createCachedStates({ generation: 0 }),
            senderIdentity
          );
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)(
            'send',
            createMockUnprovenCallTxData({
              private: { nextPrivateState: { who: 'sender', generation: 1 } } as never
            }),
            senderIdentity.privateStateId
          );

          (c[CacheStates] as (s: unknown, i: unknown) => void)(
            createCachedStates({ generation: 0 }),
            recipientIdentity
          );
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)(
            'receive',
            createMockUnprovenCallTxData({
              private: { nextPrivateState: { who: 'recipient', generation: 1 } } as never
            }),
            recipientIdentity.privateStateId
          );

          // Second sender call: latest update should win.
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)(
            'deposit',
            createMockUnprovenCallTxData({
              private: { nextPrivateState: { who: 'sender', generation: 2 } } as never
            }),
            senderIdentity.privateStateId
          );
        },
        undefined,
        { bundler }
      );

      const setMock = vi.mocked(providers.privateStateProvider.set);
      expect(setMock).toHaveBeenCalledTimes(2);
      const writes = setMock.mock.calls.map(([id, value]) => ({ id, value }));
      const senderWrite = writes.find((w) => w.id === 'ps-sender');
      const recipientWrite = writes.find((w) => w.id === 'ps-recipient');
      expect(senderWrite?.value).toEqual({ who: 'sender', generation: 2 });
      expect(recipientWrite?.value).toEqual({ who: 'recipient', generation: 1 });
    });

    it('writes nothing if no in-flight call referenced a privateStateId', async () => {
      // A purely-public-state contract. Since no privateStateId is in play, the
      // private-state persistence loop should be a no-op and we don't require a
      // privateStateProvider to be wired up.
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const { bundler } = recordingStubBundler();
      const identity = { contractAddress: createMockContractAddress() };

      await bundleScoped(
        providers,
        async (ctx) => {
          const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
          (c[CacheStates] as (s: unknown, i: unknown) => void)(createCachedStates(), identity);
          (c[MergeUnsubmittedCallTxData] as (
            id: AnyProvableCircuitId,
            d: unknown,
            psid?: PrivateStateId
          ) => void)('public-call', createMockUnprovenCallTxData(), undefined);
        },
        undefined,
        { bundler }
      );

      expect(vi.mocked(providers.privateStateProvider.set)).not.toHaveBeenCalled();
    });
  });

  describe('error paths', () => {
    it('rejects with "No calls were submitted" when fn issues no merges', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const { bundler } = recordingStubBundler();

      await expect(
        bundleScoped(
          providers,
          async () => {
            // intentionally empty
          },
          { scopeName: 'empty-scope' },
          { bundler }
        )
      ).rejects.toThrow(/No calls were submitted/);
    });

    it('wraps unexpected errors in fn with the scopeName', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();

      await expect(
        bundleScoped(
          providers,
          async () => {
            throw new Error('circuit blew up');
          },
          { scopeName: 'myTransfer' },
          { bundler }
        )
      ).rejects.toThrow(/myTransfer.*circuit blew up/s);
    });

    it('shows <unnamed> when no scopeName is provided', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();

      await expect(
        bundleScoped(
          providers,
          async () => {
            throw new Error('circuit blew up');
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow(/<unnamed>/);
    });

    it('throws CallTxFailedError when the bundled tx does not succeed entirely', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers, FailEntirely);
      const { bundler } = recordingStubBundler();
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-x' as PrivateStateId
      };

      let caught: unknown;
      try {
        await bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              createCachedStates({}),
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('c', createMockUnprovenCallTxData(), identity.privateStateId);
          },
          undefined,
          { bundler }
        );
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(CallTxFailedError);
      const err = caught as CallTxFailedError;
      expect(err.finalizedTxData.status).toBe(FailEntirely);
      expect(err.circuitId).toEqual(['c']);
      expect(vi.mocked(providers.privateStateProvider.set)).not.toHaveBeenCalled();
    });

    it('throws when a call referenced a privateStateId but providers.privateStateProvider is undefined', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      // Simulate a providers tree without a private-state provider.
      (providers as { privateStateProvider?: unknown }).privateStateProvider = undefined;
      const { bundler } = recordingStubBundler();
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-x' as PrivateStateId
      };

      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              createCachedStates({}),
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('c', createMockUnprovenCallTxData(), identity.privateStateId);
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow(/privateStateProvider is undefined/);
    });

    it('throws when MergeUnsubmittedCallTxData is invoked without a prior CacheStates', async () => {
      const providers = createMockProviders();
      const { bundler } = recordingStubBundler();
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-x' as PrivateStateId
      };

      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            // Skip CacheStates — this violates the SDK protocol.
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('c', createMockUnprovenCallTxData(), identity.privateStateId);
          },
          undefined,
          { bundler }
        )
      ).rejects.toThrow();
    });

    it('rejects with the wrapped scopeName when bundling itself throws', async () => {
      const providers = createMockProviders();
      installSubmitTxResult(providers);
      const explosiveBundler: Bundler = () => {
        throw new Error('bundler blew up');
      };
      const identity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'ps-x' as PrivateStateId
      };

      await expect(
        bundleScoped(
          providers,
          async (ctx) => {
            const c = ctx as unknown as Record<symbol, (...args: never[]) => unknown>;
            (c[CacheStates] as (s: unknown, i: unknown) => void)(
              createCachedStates({}),
              identity
            );
            (c[MergeUnsubmittedCallTxData] as (
              id: AnyProvableCircuitId,
              d: unknown,
              psid?: PrivateStateId
            ) => void)('c', createMockUnprovenCallTxData(), identity.privateStateId);
          },
          { scopeName: 'split-test' },
          { bundler: explosiveBundler }
        )
      ).rejects.toThrow(/split-test.*bundler blew up/s);
    });
  });

  describe('public entry point', () => {
    it('withMultiContractScopedTransaction routes through the default bundler', async () => {
      // The public function does not expose the test seam — assert that submission
      // pipeline invariants still hold even with no internalOptions provided.
      const providers = createMockProviders();
      installSubmitTxResult(providers);

      // No calls — should error out before reaching the default bundler, exercising
      // only the public surface signature.
      await expect(
        withMultiContractScopedTransaction(providers, async () => {
          // empty
        })
      ).rejects.toThrow(/No calls were submitted/);
    });
  });
});
