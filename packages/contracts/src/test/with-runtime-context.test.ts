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

import {
  type DeserializationContext,
  DeserializationError,
  isDeserializationError
} from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { type RuntimeCallContext, withRuntimeContext } from '../internal/with-runtime-context';

const innerContext: DeserializationContext = {
  dataType: 'ContractState',
  source: 'ledger',
  caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState',
  callee: '@midnight-ntwrk/ledger-v8',
  classification: 'version-mismatch',
  direction: 'data-newer-than-code',
  mitigation: ['Hint A', 'Hint B'],
  extracted: { dataType: 'ContractState', expectedVersion: 6, receivedVersion: 7 }
};

describe('withRuntimeContext', () => {
  describe('happy path', () => {
    it('returns the resolved value when fn() resolves', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };

      const result = await withRuntimeContext(ctx, async () => 42);

      expect(result).toBe(42);
    });
  });

  describe('non-DeserializationError pass-through (D3)', () => {
    it('re-throws non-DeserializationError unchanged (same reference)', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const thrown = new Error('proof generation failed');
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw thrown;
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBe(thrown);
      expect(isDeserializationError(caught)).toBe(false);
    });
  });

  describe('DeserializationError enrichment', () => {
    it('overwrites caller for { operation: "call", circuitId: "myCircuit" }', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe('@midnight-ntwrk/midnight-js-contracts:call(myCircuit)');
      }
    });

    it('overwrites caller for { operation: "deploy" } (no circuitId) with "-"', async () => {
      const ctx: RuntimeCallContext = { operation: 'deploy' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe('@midnight-ntwrk/midnight-js-contracts:deploy(-)');
      }
    });

    it('overwrites caller for { operation: "find", circuitId: "redeem" }', async () => {
      const ctx: RuntimeCallContext = { operation: 'find', circuitId: 'redeem' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe('@midnight-ntwrk/midnight-js-contracts:find(redeem)');
      }
    });

    it('preserves callee from the inner error (D15)', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.callee).toBe('@midnight-ntwrk/ledger-v8');
      }
    });

    it('preserves dataType, source, classification, direction, mitigation, extracted', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.dataType).toBe(innerContext.dataType);
        expect(caught.context.source).toBe(innerContext.source);
        expect(caught.context.classification).toBe(innerContext.classification);
        expect(caught.context.direction).toBe(innerContext.direction);
        expect(caught.context.mitigation).toEqual(innerContext.mitigation);
        expect(caught.context.extracted).toEqual(innerContext.extracted);
      }
    });

    it('sets cause to inner.cause (flat chain — outer.cause === inner.cause)', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const rootCause = new Error('ledger boom');
      const inner = new DeserializationError(innerContext, rootCause);
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.cause).toBe(rootCause);
        expect(caught.cause).toBe(inner.cause);
        expect(caught).not.toBe(inner);
      }
    });

    it('throws a new DeserializationError instance (not the same reference)', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext, new Error('ledger boom'));
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).not.toBe(inner);
      expect(caught).toBeInstanceOf(DeserializationError);
    });
  });

  describe('unconditional flat-chain: inner cause passes through as-is (spec §7.5)', () => {
    it('outer cause === inner.cause when inner.cause is a string (passes through, NEVER re-wraps inner)', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext, new Error('placeholder'));
      Object.defineProperty(inner, 'cause', { value: 'not-an-error', configurable: true });
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.cause).toBe('not-an-error');
        expect(caught).not.toBe(inner);
      }
    });

    it('outer cause is undefined when inner has no cause at all', async () => {
      const ctx: RuntimeCallContext = { operation: 'call', circuitId: 'myCircuit' };
      const inner = new DeserializationError(innerContext);  // no cause arg
      let caught: unknown;

      try {
        await withRuntimeContext(ctx, async () => {
          throw inner;
        });
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.cause).toBeUndefined();
      }
    });
  });
});
