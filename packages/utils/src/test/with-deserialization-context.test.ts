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

import { describe, expect, it } from 'vitest';

import { DeserializationError, isDeserializationError } from '../deserialization';
import type { DeserializationCallSite } from '../deserialization/deserialization-error';
import { withDeserializationContext } from '../deserialization/with-deserialization-context';

const callSite: DeserializationCallSite = {
  dataType: 'ContractState',
  source: 'ledger',
  caller: '@midnight-ntwrk/midnight-js-test:fixture'
};

describe('withDeserializationContext', () => {
  describe('happy path', () => {
    it('returns the value when fn() succeeds', () => {
      const result = withDeserializationContext(callSite, () => 42);

      expect(result).toBe(42);
    });

    it('preserves the return type via generics', () => {
      const result: { hello: string } = withDeserializationContext(callSite, () => ({ hello: 'world' }));

      expect(result).toEqual({ hello: 'world' });
    });
  });

  describe('Error wrapping', () => {
    it('wraps thrown Error into DeserializationError', () => {
      const cause = new Error('expected header tag \'midnight:contract-state[v6]:\', got \'\'');

      expect(() => withDeserializationContext(callSite, () => { throw cause; }))
        .toThrow(DeserializationError);
    });

    it('preserves cause Error on the thrown DeserializationError', () => {
      const cause = new Error('expected header tag \'midnight:contract-state[v6]:\', got \'\'');

      try {
        withDeserializationContext(callSite, () => { throw cause; });
      } catch (e) {
        expect(isDeserializationError(e)).toBe(true);
        if (isDeserializationError(e)) {
          expect(e.cause).toBe(cause);
        }
      }
    });

    it('propagates classify() output (source, dataType, classification) into context', () => {
      const cause = new Error('expected header tag \'midnight:contract-state[v6]:\', got \'midnight:contract-state[v5]:\'');

      try {
        withDeserializationContext(callSite, () => { throw cause; });
      } catch (e) {
        if (isDeserializationError(e)) {
          expect(e.context.source).toBe('ledger');
          expect(e.context.classification).toBe('version-mismatch');
          expect(e.context.caller).toBe('@midnight-ntwrk/midnight-js-test:fixture');
        }
      }
    });
  });

  describe('non-Error throws (pass-through)', () => {
    it.each([
      ['string', 'just a string'],
      ['number', 42],
      ['null', null],
      ['object without name', { foo: 'bar' }]
    ])('re-throws %s unchanged (no wrapping)', (_label, thrown) => {
      let caught: unknown;
      try {
        withDeserializationContext(callSite, () => { throw thrown; });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBe(thrown);
      expect(isDeserializationError(caught)).toBe(false);
    });
  });

  describe('sync-only enforcement', () => {
    it('throws TypeError when fn() returns a Promise (silent bypass guard)', () => {
      expect(() =>
        withDeserializationContext<Promise<number>>(callSite, () => Promise.resolve(42))
      ).toThrow(TypeError);
    });
  });
});
