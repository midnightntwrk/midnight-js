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

import type { MidnightConfig } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { intentTtl, networkIdOf } from '../internal/midnight-config';

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const config = (overrides: Partial<Record<keyof MidnightConfig, unknown>>): MidnightConfig =>
  Object.assign({ networkId: 'undeployed', ttlSeconds: 600 }, overrides);

describe('networkIdOf', () => {
  it('returns the configured network id', () => {
    expect(networkIdOf(config({ networkId: 'preview' }))).toBe('preview');
  });

  it('rejects a missing config, naming providers.config', () => {
    expect(() => networkIdOf(undefined)).toThrow(/providers\.config.*networkId.*ttlSeconds/);
  });

  it('rejects an empty network id', () => {
    expect(() => networkIdOf(config({ networkId: '' }))).toThrow(TypeError);
    expect(() => networkIdOf(config({ networkId: '' }))).toThrow(/networkId/);
  });
});

describe('intentTtl', () => {
  it('adds ttlSeconds to now', () => {
    expect(intentTtl(config({ ttlSeconds: 600 }), NOW)).toEqual(new Date(NOW + 600_000));
  });

  it('rejects a missing config, naming providers.config', () => {
    expect(() => intentTtl(undefined, NOW)).toThrow(/providers\.config/);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '600', 1e15])(
    'rejects ttlSeconds = %s',
    (ttlSeconds) => {
      expect(() => intentTtl(config({ ttlSeconds }), NOW)).toThrow(RangeError);
      expect(() => intentTtl(config({ ttlSeconds }), NOW)).toThrow(/ttlSeconds/);
    }
  );
});
