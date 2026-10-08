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

import { ConfigurationError, InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { MidnightConfig } from '@midnight-ntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertValidMidnightConfig, intentTtl } from '../midnight-config';

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const config = (overrides: Partial<Record<keyof MidnightConfig, unknown>>): MidnightConfig =>
  Object.assign({ networkId: 'undeployed', ttlSeconds: 600 }, overrides);

describe('assertValidMidnightConfig', () => {
  it('accepts a valid config', () => {
    expect(() => assertValidMidnightConfig(config({}))).not.toThrow();
  });

  it.each([undefined, null])('rejects a %s config, naming providers.config and both fields', (missing) => {
    expect(() => assertValidMidnightConfig(missing)).toThrow(ConfigurationError);
    expect(() => assertValidMidnightConfig(missing)).toThrow(/providers\.config.*networkId.*ttlSeconds/);
  });

  it('names the place the config was read from', () => {
    expect(() => assertValidMidnightConfig(undefined, 'options.config')).toThrow(/^options\.config is missing/);
  });

  it('refuses a missing config with the unchanged message', () => {
    expect(() => assertValidMidnightConfig(undefined)).toThrow(
      new ConfigurationError('providers.config is missing. Pass { networkId, ttlSeconds } as providers.config.')
    );
  });

  it('refuses an empty networkId with InvalidArgumentError and the unchanged message', () => {
    expect(() => assertValidMidnightConfig(config({ networkId: '' }))).toThrow(
      new InvalidArgumentError(
        'providers.config.networkId must be a non-empty string without surrounding whitespace, got "".'
      )
    );
  });

  it('refuses ttlSeconds 0 with InvalidArgumentError and the unchanged message', () => {
    expect(() => assertValidMidnightConfig(config({ ttlSeconds: 0 }))).toThrow(
      new InvalidArgumentError('providers.config.ttlSeconds must be a positive whole number of seconds, got 0.')
    );
  });

  it.each(['', ' preview', 'preview\n', 42, 1n, undefined, null])('rejects networkId = %s', (networkId) => {
    expect(() => assertValidMidnightConfig(config({ networkId }))).toThrow(InvalidArgumentError);
    expect(() => assertValidMidnightConfig(config({ networkId }))).toThrow(/networkId/);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '600', 1e15])(
    'rejects ttlSeconds = %s',
    (ttlSeconds) => {
      expect(() => assertValidMidnightConfig(config({ ttlSeconds }))).toThrow(InvalidArgumentError);
      expect(() => assertValidMidnightConfig(config({ ttlSeconds }))).toThrow(/ttlSeconds/);
    }
  );

  it('shows a string ttlSeconds as a string, so it does not read as a valid number', () => {
    expect(() => assertValidMidnightConfig(config({ ttlSeconds: '600' }))).toThrow(/got "600"/);
  });

  it.each([1, 86_400])('accepts ttlSeconds = %s', (ttlSeconds) => {
    expect(() => assertValidMidnightConfig(config({ ttlSeconds }))).not.toThrow();
  });
});

describe('intentTtl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds ttlSeconds to the current time', () => {
    expect(intentTtl(config({ ttlSeconds: 600 }))).toEqual(new Date(NOW + 600_000));
  });

  it('rejects an invalid ttlSeconds', () => {
    expect(() => intentTtl(config({ ttlSeconds: 0 }))).toThrow(InvalidArgumentError);
  });
});
