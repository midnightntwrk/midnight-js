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
import type { TransactionStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, it, vi } from 'vitest';

import {
  ForeignLedgerTransactionError,
  InvalidTransactionHandleError,
  PROVIDER_ERROR_CODES,
  ProviderEraUnsupportedError,
  type TransactionMethod
} from '../errors';
import { LedgerTransaction } from '../ledger-transaction';
import { createMidnightProviderFromHandlers } from '../midnight-provider';
import { createProofProviderFromHandlers } from '../proof-provider';
import { createWalletProviderFromHandlers } from '../wallet-provider';
import { handles, ledgerTransactions } from './ledger-transaction-fixtures';

const coinPublicKey = 'coin-pk';
const encryptionPublicKey = 'enc-pk';

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

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

interface BuiltProvider {
  readonly supportedEras: readonly LedgerVersion[];
  readonly send: (era: LedgerVersion) => Promise<unknown>;
  readonly sendValue: (value: unknown) => Promise<unknown>;
}

interface FactoryCase {
  readonly method: TransactionMethod;
  readonly inputStage: TransactionStage;
  readonly wrongStage: TransactionStage;
  readonly answerStage: TransactionStage | undefined;
  readonly answer: (era: LedgerVersion) => Promise<unknown>;
  readonly otherHandlers: object;
  readonly create: (handlers: unknown) => BuiltProvider;
}

const factories: readonly FactoryCase[] = [
  {
    method: 'proveTx',
    inputStage: 'Unproven',
    wrongStage: 'Unbound',
    answerStage: 'Unbound',
    answer: (era) => ledgerTransactions[era].Unbound(),
    otherHandlers: {},
    create: (handlers) => {
      // @ts-expect-error the cases below pass handlers the types rule out
      const provider = createProofProviderFromHandlers(handlers);
      return {
        supportedEras: provider.supportedEras,
        send: async (era) => provider.proveTx(await handles[era].Unproven()),
        // @ts-expect-error the cases below pass values that are not unproven handles
        sendValue: (value) => provider.proveTx(value)
      };
    }
  },
  {
    method: 'balanceTx',
    inputStage: 'Unbound',
    wrongStage: 'Finalized',
    answerStage: 'Finalized',
    answer: (era) => ledgerTransactions[era].Finalized(),
    otherHandlers: keyReaders,
    create: (handlers) => {
      // @ts-expect-error the cases below pass handlers the types rule out
      const provider = createWalletProviderFromHandlers(handlers);
      return {
        supportedEras: provider.supportedEras,
        send: async (era) => provider.balanceTx(await handles[era].Unbound()),
        // @ts-expect-error the cases below pass values that are not unbound handles
        sendValue: (value) => provider.balanceTx(value)
      };
    }
  },
  {
    method: 'submitTx',
    inputStage: 'Finalized',
    wrongStage: 'Unbound',
    answerStage: undefined,
    answer: (era) => Promise.resolve(`${era}-tx-id`),
    otherHandlers: {},
    create: (handlers) => {
      // @ts-expect-error the cases below pass handlers the types rule out
      const provider = createMidnightProviderFromHandlers(handlers);
      return {
        supportedEras: provider.supportedEras,
        send: async (era) => provider.submitTx(await handles[era].Finalized()),
        // @ts-expect-error the cases below pass values that are not finalized handles
        sendValue: (value) => provider.submitTx(value)
      };
    }
  }
];

const handleAt = (era: LedgerVersion, stage: TransactionStage): Promise<LedgerTransaction<TransactionStage>> =>
  Promise.resolve(handles[era][stage]());

describe.each(factories)('$method built from per-era handlers', ({ method, inputStage, wrongStage, answerStage, answer, otherHandlers, create }) => {
  const handlerFor = (era: LedgerVersion) => vi.fn((_tx: unknown) => answer(era));
  const build = (entries: object): BuiltProvider => create({ ...otherHandlers, ...entries });

  describe('supportedEras', () => {
    it('declares only v9 when the v8 handler is undefined', () => {
      const provider = build({ v8: undefined, v9: handlerFor('v9') });

      expect(provider.supportedEras).toEqual(['v9']);
    });

    it('declares both eras when both handlers are given', () => {
      const provider = build({ v8: handlerFor('v8'), v9: handlerFor('v9') });

      expect(provider.supportedEras).toEqual(['v8', 'v9']);
    });

    it('freezes the declaration', () => {
      const provider = build({ v8: undefined, v9: handlerFor('v9') });

      expect(Object.isFrozen(provider.supportedEras)).toBe(true);
    });
  });

  describe('routing', () => {
    it.each<[LedgerVersion, LedgerVersion]>([
      ['v9', 'v8'],
      ['v8', 'v9']
    ])('hands a %s handle unwrapped to its own handler only, never to the %s one', async (era, otherEra) => {
      const handlers = { [era]: handlerFor(era), [otherEra]: handlerFor(otherEra) };
      const provider = build(handlers);
      const handle = await handleAt(era, inputStage);

      await provider.sendValue(handle);

      expect(handlers[era]).toHaveBeenCalledTimes(1);
      expect(handlers[era].mock.calls[0]?.[0]).toBe(LedgerTransaction.unwrap(handle, era));
      expect(handlers[otherEra]).not.toHaveBeenCalled();
    });

    it.each<LedgerVersion>(['v9', 'v8'])('answers a %s request in the same era at the next stage', async (era) => {
      const result = await answer(era);
      const provider = build({ v8: () => Promise.resolve(result), v9: () => Promise.resolve(result) });

      const answered = await provider.send(era);

      if (answerStage === undefined) {
        expect(answered).toBe(result);
      } else {
        expect(LedgerTransaction.is(answered)).toBe(true);
        expect(answered).toMatchObject({ era, stage: answerStage });
        expect(LedgerTransaction.is(answered) && LedgerTransaction.unwrap(answered, era)).toBe(result);
      }
    });

    it('propagates a handler failure to the caller', async () => {
      const provider = build({ v8: undefined, v9: () => Promise.reject(new Error('handler refused')) });

      await expect(provider.send('v9')).rejects.toThrow('handler refused');
    });
  });

  describe('refusals at the method', () => {
    it('refuses an era it has no handler for before calling any handler', async () => {
      const v9 = handlerFor('v9');
      const provider = build({ v8: undefined, v9 });

      const rejection = await rejectionOf(provider.send('v8'));

      expect(rejection).toBeInstanceOf(ProviderEraUnsupportedError);
      expect(rejection).toMatchObject({
        code: PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED,
        method,
        era: 'v8',
        declared: ['v9']
      });
      expect(v9).not.toHaveBeenCalled();
    });

    it.each([
      ['the pre-handle version-tagged payload', () => ({ version: 'v9', tx: ledgerTransactions.v9.Unproven() }), 'an object'],
      ['a raw ledger transaction', () => ledgerTransactions.v9.Unproven(), 'an instance of Transaction'],
      ['null', () => null, 'null'],
      ['undefined', () => undefined, 'undefined']
    ])('refuses %s as not a handle, without calling a handler', async (_label, value, detail) => {
      const v8 = handlerFor('v8');
      const v9 = handlerFor('v9');
      const provider = build({ v8, v9 });

      const rejection = await rejectionOf(provider.sendValue(value()));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(rejection).toMatchObject({
        code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
        method,
        reason: 'not-a-handle',
        detail
      });
      expect([v8.mock.calls.length, v9.mock.calls.length]).toEqual([0, 0]);
    });

    it('refuses a handle at another stage, without calling a handler', async () => {
      const v9 = handlerFor('v9');
      const provider = build({ v8: undefined, v9 });

      const rejection = await rejectionOf(provider.sendValue(await handleAt('v9', wrongStage)));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(rejection).toMatchObject({
        code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
        method,
        reason: 'wrong-stage'
      });
      expect(String(rejection)).toContain(`${wrongStage} handle, where ${method} takes ${inputStage} handles`);
      expect(v9).not.toHaveBeenCalled();
    });

    it('checks the stage before the era, so a wrong-stage handle of an unserved era reports the stage', async () => {
      const provider = build({ v8: undefined, v9: handlerFor('v9') });

      const rejection = await rejectionOf(provider.sendValue(await handleAt('v8', wrongStage)));

      expect(rejection).toMatchObject({ name: 'InvalidTransactionHandleError', reason: 'wrong-stage' });
    });
  });

  describe('handler binding', () => {
    it('calls each era handler with the handlers object as `this`', async () => {
      const receivers: unknown[] = [];
      class Handlers {
        v8(this: unknown): Promise<unknown> {
          receivers.push(this);
          return answer('v8');
        }
        v9(this: unknown): Promise<unknown> {
          receivers.push(this);
          return answer('v9');
        }
      }
      const handlers = Object.assign(new Handlers(), otherHandlers);
      const provider = create(handlers);

      await provider.send('v9');
      await provider.send('v8');

      expect(receivers).toHaveLength(2);
      expect(receivers.every((receiver) => receiver === handlers)).toBe(true);
    });

    it('calls a handler that carries its own `call` property', async () => {
      const v9 = Object.assign(handlerFor('v9'), { call: () => Promise.reject(new Error('own call property used')) });
      const provider = build({ v8: undefined, v9 });

      await provider.send('v9');

      expect(v9).toHaveBeenCalledTimes(1);
    });

    it('keeps serving the handlers it was built with when the caller replaces them afterwards', async () => {
      const v9 = handlerFor('v9');
      const handlers: { v8: unknown; v9: unknown } = { v8: undefined, v9 };
      const provider = build(handlers);

      handlers.v8 = handlerFor('v8');
      handlers.v9 = null;
      await provider.send('v9');

      expect(provider.supportedEras).toEqual(['v9']);
      expect(v9).toHaveBeenCalledTimes(1);
    });
  });

  describe('construction', () => {
    it.each([
      ['null', null, 'null'],
      ['an object', {}, 'an object'],
      ['a string', 'not-a-function', 'a string'],
      ['a number', 42, 'a number'],
      ['an array', [() => undefined], 'an array'],
      ['a class', class {}, 'a class'],
      ['a revoked function proxy', revokedFunctionProxy(), 'a function that cannot be called'],
      ['a revoked proxy', revokedProxy(), 'an object']
    ])('refuses %s as an era handler', (_label, value, received) => {
      const errors = (['v8', 'v9'] as const).map((era) => {
        try {
          build({ v8: undefined, v9: undefined, [era]: value });
        } catch (error: unknown) {
          return error;
        }
        return undefined;
      });

      expect(errors).toEqual([
        expect.objectContaining({
          name: 'UnusableEraEntryError',
          code: PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY,
          method,
          era: 'v8',
          expected: 'handler',
          received
        }),
        expect.objectContaining({ name: 'UnusableEraEntryError', method, era: 'v9', expected: 'handler', received })
      ]);
    });

    it.each([
      ['v8', () => ({ v9: handlerFor('v9') })],
      ['v9', () => ({ v8: handlerFor('v8') })],
      ['v8', () => ({ V8: handlerFor('v8'), v9: handlerFor('v9') })],
      ['v8, v9', () => ({})]
    ])('refuses handlers without a %s key', (missing, entries) => {
      const act = () => build(entries());

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining(`missing ${missing}`)
        })
      );
    });

    it.each([
      ['undefined', undefined, 'got undefined'],
      ['null', null, 'got null'],
      ['a string', 'handlers', 'got a string'],
      ['a revoked proxy', revokedProxy(), 'could not be read']
    ])('refuses %s as the handlers', (_label, handlers, detail) => {
      const act = () => create(handlers);

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining(detail)
        })
      );
    });

    it('refuses handlers that serve no era', () => {
      const act = () => build({ v8: undefined, v9: undefined });

      expect(act).toThrow(
        expect.objectContaining({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringMatching(new RegExp(`^${method}: at least one era handler is required`))
        })
      );
    });

    it('serves no era inherited from Object.prototype', () => {
      Object.defineProperty(Object.prototype, 'v8', {
        value: handlerFor('v8'),
        configurable: true,
        enumerable: true,
        writable: true
      });
      let refusal: unknown;
      try {
        build({ v9: handlerFor('v9') });
      } catch (error: unknown) {
        refusal = error;
      } finally {
        Reflect.deleteProperty(Object.prototype, 'v8');
      }

      expect(refusal).toMatchObject({ name: 'InvalidArgumentError', message: expect.stringContaining('missing v8') });
    });
  });
});

describe.each(factories.filter(({ answerStage }) => answerStage !== undefined))(
  '$method sealing the answer',
  ({ answer, otherHandlers, create }) => {
    it.each([
      ['a structural lookalike', () => Promise.resolve({ serialize: () => new Uint8Array() })],
      ['an object of the other era', () => answer('v8')]
    ])('refuses %s returned by a handler as a foreign transaction', async (_label, returned) => {
      const provider = create({ ...otherHandlers, v8: undefined, v9: returned });

      const rejection = await rejectionOf(provider.send('v9'));

      expect(rejection).toBeInstanceOf(ForeignLedgerTransactionError);
      expect(rejection).toMatchObject({
        code: PROVIDER_ERROR_CODES.FOREIGN_LEDGER_TRANSACTION,
        era: 'v9',
        reason: 'foreign-instance'
      });
    });
  }
);

describe('createWalletProviderFromHandlers key readers', () => {
  const balance = () => ledgerTransactions.v9.Finalized();

  it('passes the key readers through unchanged', () => {
    const provider = createWalletProviderFromHandlers({ v8: undefined, v9: balance, ...keyReaders });

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([coinPublicKey, encryptionPublicKey]);
  });

  it.each([
    ['getCoinPublicKey', { getEncryptionPublicKey: keyReaders.getEncryptionPublicKey }],
    ['getEncryptionPublicKey', { getCoinPublicKey: keyReaders.getCoinPublicKey }]
  ])('refuses handlers missing %s at construction', (missing, readers) => {
    // @ts-expect-error a key reader is missing
    const act = () => createWalletProviderFromHandlers({ v8: undefined, v9: balance, ...readers });

    expect(act).toThrow(
      expect.objectContaining({
        name: 'InvalidArgumentError',
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: expect.stringContaining(missing)
      })
    );
  });

  it('keeps the key readers it was built with when the caller replaces them afterwards', () => {
    const handlers = { v8: undefined, v9: balance, ...keyReaders };
    const provider = createWalletProviderFromHandlers(handlers);

    handlers.getCoinPublicKey = () => 'other-coin-pk';
    handlers.getEncryptionPublicKey = () => 'other-enc-pk';

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([coinPublicKey, encryptionPublicKey]);
  });

  it('calls the key readers with the handlers object as `this`', () => {
    class Wallet {
      readonly coinPublicKey = coinPublicKey;
      readonly encryptionPublicKey = encryptionPublicKey;
      readonly v8 = undefined;
      v9(): ReturnType<typeof balance> {
        return balance();
      }
      getCoinPublicKey(): string {
        return this.coinPublicKey;
      }
      getEncryptionPublicKey(): string {
        return this.encryptionPublicKey;
      }
    }

    const provider = createWalletProviderFromHandlers(new Wallet());

    expect([provider.getCoinPublicKey(), provider.getEncryptionPublicKey()]).toEqual([coinPublicKey, encryptionPublicKey]);
  });
});
