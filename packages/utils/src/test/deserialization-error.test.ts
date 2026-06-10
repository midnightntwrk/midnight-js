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

import {
  type DeserializationContext,
  DeserializationError,
  isDeserializationError
} from '../deserialization';

const baseContext: DeserializationContext = {
  dataType: 'ContractState',
  source: 'ledger',
  caller: '@midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState',
  classification: 'version-mismatch',
  mitigation: ['Hint A', 'Hint B']
};

describe('DeserializationError', () => {
  describe('identity', () => {
    it('is an instance of Error', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of DeserializationError', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error).toBeInstanceOf(DeserializationError);
    });

    it('has name "DeserializationError"', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.name).toBe('DeserializationError');
    });
  });

  describe('message format (per spec §7.6)', () => {
    it('contains "Failed to deserialize <dataType> (<source>)." on first line', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message.split('\n')[0]).toBe('Failed to deserialize ContractState (ledger).');
    });

    it('renders the caller line', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message).toContain(
        '  Call site: @midnight-ntwrk/midnight-js-indexer-public-data-provider:queryContractState'
      );
    });

    it('renders Classification line without direction when direction is undefined', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message).toContain('  Classification: version-mismatch\n');
      expect(error.message).not.toContain('direction:');
    });

    it('renders Classification line with direction suffix when direction is set', () => {
      const ctx: DeserializationContext = { ...baseContext, direction: 'data-newer-than-code' };

      const error = new DeserializationError(ctx, new Error('inner'));

      expect(error.message).toContain('  Classification: version-mismatch (direction: data-newer-than-code)');
    });

    it('does NOT render hardcoded "Pinned versions" line (stale-string concern)', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message).not.toContain('Pinned versions');
    });

    it('omits Extracted line when context.extracted is undefined', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message).not.toContain('Extracted:');
    });

    it('renders Extracted line with present fields only', () => {
      const ctx: DeserializationContext = {
        ...baseContext,
        extracted: { dataType: 'ZswapChainState', expectedVersion: 5, receivedVersion: 6 }
      };

      const error = new DeserializationError(ctx, new Error('inner'));

      expect(error.message).toContain('Extracted:');
      expect(error.message).toContain('dataType=ZswapChainState');
      expect(error.message).toContain('expected=5');
      expect(error.message).toContain('got=6');
    });

    it('renders mitigation list as dash-prefixed lines with 4-space indent', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.message).toContain('  Mitigation:\n    - Hint A\n    - Hint B');
    });

    it('renders "(none)" when mitigation is empty', () => {
      const ctx: DeserializationContext = { ...baseContext, mitigation: [] };

      const error = new DeserializationError(ctx, new Error('inner'));

      expect(error.message).toContain('  Mitigation: (none)');
      expect(error.message).not.toContain('    -');
    });
  });

  describe('cause chain', () => {
    it('preserves cause Error reference', () => {
      const cause = new Error('original error from ledger');

      const error = new DeserializationError(baseContext, cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('context exposure', () => {
    it('exposes the supplied context via readonly field', () => {
      const error = new DeserializationError(baseContext, new Error('inner'));

      expect(error.context).toEqual(baseContext);
    });
  });
});

describe('isDeserializationError', () => {
  it('returns true for DeserializationError instance', () => {
    const error = new DeserializationError(baseContext, new Error('inner'));

    expect(isDeserializationError(error)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isDeserializationError(new Error('plain'))).toBe(false);
  });

  it('returns false for null/undefined/primitives/empty object', () => {
    expect(isDeserializationError(null)).toBe(false);
    expect(isDeserializationError(undefined)).toBe(false);
    expect(isDeserializationError('string')).toBe(false);
    expect(isDeserializationError(42)).toBe(false);
    expect(isDeserializationError({})).toBe(false);
  });
});
