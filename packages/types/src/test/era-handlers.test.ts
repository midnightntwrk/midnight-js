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

import { COMMON_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type {
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  TransactionId,
  UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, it, vi } from 'vitest';

import { PROVIDER_ERROR_CODES, type ProviderSeam, UntaggedPayloadError, V8PayloadUnsupportedError } from '../errors';
import {
  createMidnightProviderFromHandlers,
  type MidnightProviderHandlers
} from '../midnight-provider';
import {
  createProofProviderFromHandlers,
  type ProofProviderHandlers,
  type UnboundTransaction,
  type VersionedUnboundTransaction,
  type VersionedUnprovenTransaction
} from '../proof-provider';
import {
  createWalletProviderFromHandlers,
  type VersionedFinalizedTransaction,
  type WalletProviderHandlers
} from '../wallet-provider';

const coinPublicKey = 'coin-pk' as CoinPublicKey;
const encryptionPublicKey = 'enc-pk' as EncPublicKey;

const stubUnproven = (): UnprovenTransaction => ({}) as UnprovenTransaction;
const stubUnbound = (): UnboundTransaction => ({}) as UnboundTransaction;
const stubFinalized = (): FinalizedTransaction => ({}) as FinalizedTransaction;

const keyReaders = {
  getCoinPublicKey: () => coinPublicKey,
  getEncryptionPublicKey: () => encryptionPublicKey
};

const revokedProxy = (): object => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
};

const revokedFunctionProxy = (): object => {
  const { proxy, revoke } = Proxy.revocable(() => undefined, {});
  revoke();
  return proxy;
};

describe('createProofProviderFromHandlers', () => {
  it('declares exactly the current era when no retained handler is supplied', () => {
    const provider = createProofProviderFromHandlers({ currentEra: async () => stubUnbound() });

    // Set equality, not `toContain`: a declaration that leaked an era it
    // cannot serve is the failure this field exists to prevent, and a
    // one-directional assertion would pass for it.
    expect([...provider.supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained handler is supplied', () => {
    const provider = createProofProviderFromHandlers({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: async (bytes) => bytes }
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  // The declaration is read by the pre-flight check in `assertSeamsSupportEra`,
  // so a consumer must not be able to widen it after construction and make the
  // check pass for an era the handlers do not serve.
  it('freezes the declaration', () => {
    const provider = createProofProviderFromHandlers({ currentEra: async () => stubUnbound() });

    expect(Object.isFrozen(provider.supportedEras)).toBe(true);
  });

  it('drives the current-era handler with the bare transaction and tags the answer', async () => {
    const unproven = stubUnproven();
    const unbound = stubUnbound();
    const currentEra = vi.fn(async () => unbound);
    const provider = createProofProviderFromHandlers({ currentEra });

    const result = await provider.proveTx({ version: 'v9', tx: unproven }, { timeout: 5 });

    expect(currentEra).toHaveBeenCalledWith(unproven, { timeout: 5 });
    expect(result.version).toBe('v9');
    // Identity, not structural equality: two structurally-equal ledger objects
    // can come from different WASM instances, which is what these seams exist
    // to keep apart.
    expect(result.version === 'v9' && result.tx).toBe(unbound);
  });

  it('drives the retained-era handler with the bare bytes and answers in the same era', async () => {
    const requested = new Uint8Array([1, 2, 3]);
    const proven = new Uint8Array([4, 5, 6]);
    const retained = vi.fn(async () => proven);
    const provider = createProofProviderFromHandlers({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: retained }
    });

    const result = await provider.proveTx({ version: 'v8', txBytes: requested }, { timeout: 7 });

    expect(retained).toHaveBeenCalledWith(requested, { timeout: 7 });
    expect(result).toEqual({ version: 'v8', txBytes: proven });
  });

  it('never crosses the eras: a current-era request does not reach the retained handler', async () => {
    const retained = vi.fn(async (bytes: Uint8Array) => bytes);
    const provider = createProofProviderFromHandlers({
      currentEra: async () => stubUnbound(),
      retainedEras: { v8: retained }
    });

    await provider.proveTx({ version: 'v9', tx: stubUnproven() });

    expect(retained).not.toHaveBeenCalled();
  });

  it('rejects a retained era it was given no handler for, with its stable code', async () => {
    const currentEra = vi.fn(async () => stubUnbound());
    const provider = createProofProviderFromHandlers({ currentEra });

    const rejection = await provider.proveTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect((rejection as V8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('proveTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload — the shape a pre-5.0.0 caller passes', async () => {
    const currentEra = vi.fn(async () => stubUnbound());
    const provider = createProofProviderFromHandlers({ currentEra });

    const rejection = await provider
      .proveTx(stubUnproven() as unknown as VersionedUnprovenTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect((rejection as UntaggedPayloadError).seam).toBe('proveTx');
    expect(currentEra).not.toHaveBeenCalled();
  });
});

describe('createWalletProviderFromHandlers', () => {
  const currentOnly = () =>
    createWalletProviderFromHandlers({ currentEra: async () => stubFinalized(), ...keyReaders });

  it('declares exactly the current era when no retained handler is supplied', () => {
    expect([...currentOnly().supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained handler is supplied', () => {
    const provider = createWalletProviderFromHandlers({
      currentEra: async () => stubFinalized(),
      retainedEras: { v8: async (bytes) => bytes },
      ...keyReaders
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  it('drives the current-era handler with the bare transaction and the ttl, and tags the answer', async () => {
    const ttl = new Date(0);
    const unbound = stubUnbound();
    const finalized = stubFinalized();
    const currentEra = vi.fn(async () => finalized);
    const provider = createWalletProviderFromHandlers({ currentEra, ...keyReaders });

    const result = await provider.balanceTx({ version: 'v9', tx: unbound }, ttl);

    expect(currentEra).toHaveBeenCalledWith(unbound, ttl);
    expect(result.version === 'v9' && result.tx).toBe(finalized);
  });

  it('drives the retained-era handler with the bare bytes and answers in the same era', async () => {
    const requested = new Uint8Array([1, 2]);
    const balanced = new Uint8Array([3, 4]);
    const retained = vi.fn(async () => balanced);
    const provider = createWalletProviderFromHandlers({
      currentEra: async () => stubFinalized(),
      retainedEras: { v8: retained },
      ...keyReaders
    });

    const result = await provider.balanceTx({ version: 'v8', txBytes: requested });

    expect(retained).toHaveBeenCalledWith(requested, undefined);
    expect(result).toEqual({ version: 'v8', txBytes: balanced });
  });

  it('hands the retained-era handler the ttl it was given', async () => {
    const retained = vi.fn(async () => new Uint8Array([3, 4]));
    const provider = createWalletProviderFromHandlers({
      currentEra: async () => stubFinalized(),
      retainedEras: { v8: retained },
      ...keyReaders
    });
    const ttl = new Date(0);

    await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1, 2]) }, ttl);

    expect(retained).toHaveBeenCalledWith(new Uint8Array([1, 2]), ttl);
  });

  it('rejects a retained era it was given no handler for, without balancing anything', async () => {
    const currentEra = vi.fn(async () => stubFinalized());
    const provider = createWalletProviderFromHandlers({ currentEra, ...keyReaders });

    const rejection = await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect((rejection as V8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('balanceTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload without balancing anything', async () => {
    const currentEra = vi.fn(async () => stubFinalized());
    const provider = createWalletProviderFromHandlers({ currentEra, ...keyReaders });

    const rejection = await provider
      .balanceTx(stubUnbound() as unknown as VersionedUnboundTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect(currentEra).not.toHaveBeenCalled();
  });

  // The two key readers answer the same for both eras, so they sit beside the
  // handlers rather than inside one.
  it('passes the key readers through unchanged', () => {
    const provider = currentOnly();

    expect(provider.getCoinPublicKey()).toBe(coinPublicKey);
    expect(provider.getEncryptionPublicKey()).toBe(encryptionPublicKey);
  });
  it.each([
    ['getCoinPublicKey', { getEncryptionPublicKey: keyReaders.getEncryptionPublicKey }],
    ['getEncryptionPublicKey', { getCoinPublicKey: keyReaders.getCoinPublicKey }]
  ])('refuses handlers missing %s at construction', (missing, readers: object) => {
    const handlers: unknown = { currentEra: async () => stubFinalized(), ...readers };

    const act = () => createWalletProviderFromHandlers(handlers as WalletProviderHandlers);

    expect(act).toThrow(
      expect.objectContaining({
        name: 'InvalidArgumentError',
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: expect.stringContaining(missing)
      })
    );
  });

  it('keeps the key readers it was built with when the caller replaces them afterwards', () => {
    const handlers = { currentEra: async () => stubFinalized(), ...keyReaders };
    const provider = createWalletProviderFromHandlers(handlers);

    handlers.getCoinPublicKey = () => 'other-coin-pk' as CoinPublicKey;
    handlers.getEncryptionPublicKey = () => 'other-enc-pk' as EncPublicKey;

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([
      coinPublicKey,
      encryptionPublicKey
    ]);
  });

  it('calls the key readers with the handlers object as `this`', () => {
    class Wallet {
      readonly coinPublicKey = coinPublicKey;
      readonly encryptionPublicKey = encryptionPublicKey;
      currentEra(): Promise<FinalizedTransaction> {
        return Promise.resolve(stubFinalized());
      }
      getCoinPublicKey(): CoinPublicKey {
        return this.coinPublicKey;
      }
      getEncryptionPublicKey(): EncPublicKey {
        return this.encryptionPublicKey;
      }
    }

    const provider = createWalletProviderFromHandlers(new Wallet());

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([
      coinPublicKey,
      encryptionPublicKey
    ]);
  });
});

describe('createMidnightProviderFromHandlers', () => {
  it('declares exactly the current era when no retained handler is supplied', () => {
    const provider = createMidnightProviderFromHandlers({ currentEra: async () => 'tx-id' as TransactionId });

    expect([...provider.supportedEras].sort()).toEqual(['v9']);
  });

  it('declares both eras when a retained handler is supplied', () => {
    const provider = createMidnightProviderFromHandlers({
      currentEra: async () => 'tx-id' as TransactionId,
      retainedEras: { v8: async () => 'tx-id-v8' as TransactionId }
    });

    expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  it('drives the current-era handler with the bare transaction and returns its id', async () => {
    const finalized = stubFinalized();
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromHandlers({ currentEra });

    const txId = await provider.submitTx({ version: 'v9', tx: finalized });

    expect(currentEra).toHaveBeenCalledWith(finalized);
    expect(txId).toBe('tx-id');
  });

  // A transaction id is era-independent, so this seam answers untagged in both
  // eras — the retained handler differs only in what it is handed.
  it('drives the retained-era handler with the bare bytes and returns its id', async () => {
    const requested = new Uint8Array([9]);
    const retained = vi.fn(async () => 'tx-id-v8' as TransactionId);
    const provider = createMidnightProviderFromHandlers({
      currentEra: async () => 'tx-id' as TransactionId,
      retainedEras: { v8: retained }
    });

    const txId = await provider.submitTx({ version: 'v8', txBytes: requested });

    expect(retained).toHaveBeenCalledWith(requested);
    expect(txId).toBe('tx-id-v8');
  });

  it('rejects a retained era it was given no handler for, without submitting anything', async () => {
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromHandlers({ currentEra });

    const rejection = await provider.submitTx({ version: 'v8', txBytes: new Uint8Array([1]) }).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect((rejection as V8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
    expect((rejection as V8PayloadUnsupportedError).seam).toBe('submitTx');
    expect(currentEra).not.toHaveBeenCalled();
  });

  it('rejects an untagged payload without submitting anything', async () => {
    const currentEra = vi.fn(async () => 'tx-id' as TransactionId);
    const provider = createMidnightProviderFromHandlers({ currentEra });

    const rejection = await provider
      .submitTx(stubFinalized() as unknown as VersionedFinalizedTransaction)
      .then(
        () => undefined,
        (error: unknown) => error
      );

    expect(rejection).toBeInstanceOf(UntaggedPayloadError);
    expect(currentEra).not.toHaveBeenCalled();
  });
});

describe('era entry validation at construction', () => {
  const v8TxBytes = new Uint8Array([1, 2, 3]);
  const servedBytes = new Uint8Array([9]);

  interface BuiltProvider {
    readonly supportedEras: readonly LedgerVersion[];
    readonly sendV8: () => Promise<unknown>;
    readonly sendV9: () => Promise<unknown>;
  }

  // Each factory is fed `unknown` handlers on purpose: the cases below are the
  // values a JavaScript caller can pass but the types rule out.
  const factories: readonly {
    readonly seam: ProviderSeam;
    readonly currentEra: unknown;
    readonly retainedHandler: () => unknown;
    readonly otherHandlers: object;
    readonly create: (handlers: unknown) => BuiltProvider;
  }[] = [
    {
      seam: 'proveTx',
      currentEra: async () => stubUnbound(),
      retainedHandler: () => vi.fn(async () => servedBytes),
      otherHandlers: {},
      create: (handlers) => {
        const provider = createProofProviderFromHandlers(handlers as ProofProviderHandlers);
        return {
          supportedEras: provider.supportedEras,
          sendV8: () => provider.proveTx({ version: 'v8', txBytes: v8TxBytes }),
          sendV9: () => provider.proveTx({ version: 'v9', tx: stubUnproven() })
        };
      }
    },
    {
      seam: 'balanceTx',
      currentEra: async () => stubFinalized(),
      retainedHandler: () => vi.fn(async () => servedBytes),
      otherHandlers: keyReaders,
      create: (handlers) => {
        const provider = createWalletProviderFromHandlers(handlers as WalletProviderHandlers);
        return {
          supportedEras: provider.supportedEras,
          sendV8: () => provider.balanceTx({ version: 'v8', txBytes: v8TxBytes }),
          sendV9: () => provider.balanceTx({ version: 'v9', tx: stubUnbound() })
        };
      }
    },
    {
      seam: 'submitTx',
      currentEra: async () => 'tx-id' as TransactionId,
      retainedHandler: () => vi.fn(async () => 'v8-tx-id' as TransactionId),
      otherHandlers: {},
      create: (handlers) => {
        const provider = createMidnightProviderFromHandlers(handlers as MidnightProviderHandlers);
        return {
          supportedEras: provider.supportedEras,
          sendV8: () => provider.submitTx({ version: 'v8', txBytes: v8TxBytes }),
          sendV9: () => provider.submitTx({ version: 'v9', tx: stubFinalized() })
        };
      }
    }
  ];

  describe.each(factories)('for $seam', ({ seam, currentEra, retainedHandler, otherHandlers, create }) => {
    const build = (entries: { readonly currentEra: unknown; readonly retainedEras?: unknown }): BuiltProvider =>
      create({ ...otherHandlers, ...entries });

    it('leaves an era unserved when its retained handler is undefined, refusing that era', async () => {
      const provider = build({ currentEra, retainedEras: { v8: undefined } });

      expect([...provider.supportedEras].sort()).toEqual(['v9']);
      await expect(provider.sendV8()).rejects.toThrow(
        expect.objectContaining({ name: 'V8PayloadUnsupportedError', code: PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED })
      );
    });

    it.each([
      ['null', null, 'null'],
      ['an object', {}, 'an object'],
      ['a string', 'not-a-function', 'a string'],
      ['a number', 42, 'a number'],
      ['an array', [() => undefined], 'an array'],
      ['a class', class {}, 'a class'],
      ['a revoked function proxy', revokedFunctionProxy(), 'a function that cannot be called'],
      ['a revoked proxy', revokedProxy(), 'an object']
    ])('refuses %s registered as a retained era entry', (_desc, value, received) => {
      const act = () => build({ currentEra, retainedEras: { v8: value } });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'UnusableEraEntryError',
          code: PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY,
          seam,
          era: 'v8',
          expected: 'handler',
          received
        })
      );
    });

    it.each([
      ['undefined', undefined, 'undefined'],
      ['null', null, 'null'],
      ['an object', {}, 'an object']
    ])('refuses %s registered as the current era entry', (_desc, value, received) => {
      const act = () => build({ currentEra: value });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'UnusableEraEntryError',
          code: PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY,
          seam,
          era: 'v9',
          expected: 'handler',
          received
        })
      );
    });

    it.each([
      ['a misspelled era key', () => ({ V8: retainedHandler() }), 'not retained eras: V8'],
      ['the current era as a key', () => ({ v9: retainedHandler() }), 'not retained eras: v9'],
      ['null', () => null, 'got null'],
      ['a bare handler', () => retainedHandler(), 'got a function'],
      ['an array', () => [retainedHandler()], 'got an array'],
      ['a string', () => 'v8', 'got a string'],
      ['a Map', () => new Map([['v8', retainedHandler()]]), 'got an instance of Map'],
      ['a class instance', () => new (class RetainedEras {})(), 'got an instance of RetainedEras'],
      ['a non-enumerable unknown key', () => Object.defineProperty({}, 'v9', { value: retainedHandler() }), 'not retained eras: v9'],
      ['a symbol key', () => ({ [Symbol('v8')]: retainedHandler() }), 'not retained eras: Symbol(v8)'],
      [
        'a class instance whose name getter throws',
        () =>
          new (class {
            static get name(): string {
              throw new Error('name getter');
            }
          })(),
        'got an object'
      ],
      ['a revoked proxy', () => revokedProxy(), 'got an object']
    ])('refuses %s as the retained era map', (_desc, retainedEras, detail) => {
      const act = () => build({ currentEra, retainedEras: retainedEras() });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining(detail)
        })
      );
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'handlers']
    ])('refuses %s as the handlers', (_desc, handlers) => {
      const act = () => create(handlers);

      expect(act).toThrow(
        expect.objectContaining({ name: 'InvalidArgumentError', code: COMMON_ERROR_CODES.INVALID_ARGUMENT })
      );
    });

    it('accepts a retained era map from another realm', () => {
      const foreignPrototype: object = Object.create(null) as object;
      const retainedEras: unknown = Object.assign(Object.create(foreignPrototype) as object, { v8: retainedHandler() });

      const provider = build({ currentEra, retainedEras });

      expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
    });

    it('keeps the current-era handler it was built with when the caller replaces it afterwards', async () => {
      const handler = vi.fn(async () => stubUnbound());
      const handlers: { currentEra: unknown } = { ...otherHandlers, currentEra: handler };
      const provider = create(handlers);

      handlers.currentEra = vi.fn();
      await provider.sendV9();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls a current-era handler that carries its own `call` property', async () => {
      const handler = Object.assign(
        vi.fn(async () => stubUnbound()),
        { call: () => Promise.reject(new Error('own call property used')) }
      );
      const provider = build({ currentEra: handler });

      await provider.sendV9();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls a retained-era handler with no `this`', async () => {
      const receivers: unknown[] = [];
      const provider = build({
        currentEra,
        retainedEras: {
          v8: function (this: unknown) {
            receivers.push(this);
            return Promise.resolve(servedBytes);
          }
        }
      });

      await provider.sendV8();

      expect(receivers).toEqual([undefined]);
    });

    it('keeps serving the handlers it was built with when the caller mutates the map afterwards', async () => {
      const handler = retainedHandler();
      const retainedEras: { v8?: unknown } = { v8: handler };
      const provider = build({ currentEra, retainedEras });

      retainedEras.v8 = null;
      await provider.sendV8();

      expect([...provider.supportedEras].sort()).toEqual(['v8', 'v9']);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls the current-era handler with the handlers object as `this`', async () => {
      const receivers: unknown[] = [];
      class Handlers {
        currentEra(this: unknown): Promise<unknown> {
          receivers.push(this);
          return Promise.resolve(stubUnbound());
        }
      }
      const handlers = Object.assign(new Handlers(), otherHandlers);
      const provider = create(handlers);

      await provider.sendV9();

      expect(receivers).toHaveLength(1);
      expect(receivers[0]).toBe(handlers);
    });

    it('serves no era inherited from Object.prototype', () => {
      const declared: (readonly LedgerVersion[])[] = [];
      Object.defineProperty(Object.prototype, 'v8', {
        value: retainedHandler(),
        configurable: true,
        enumerable: true,
        writable: true
      });
      try {
        declared.push(build({ currentEra }).supportedEras, build({ currentEra, retainedEras: {} }).supportedEras);
      } finally {
        Reflect.deleteProperty(Object.prototype, 'v8');
      }

      expect(declared.map((eras) => [...eras])).toEqual([['v9'], ['v9']]);
    });
  });
});
