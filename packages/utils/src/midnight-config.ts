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

const show = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'object' && value !== null) return 'an object';
  return String(value);
};

/**
 * Checks a {@link MidnightConfig} before any work is done with it.
 *
 * @param config The config to check; `undefined` or `null` when a caller did not pass one.
 * @param source Where the config was read from, named in the error.
 * @throws TypeError If `config` is missing, or `config.networkId` is not a non-empty string
 * without surrounding whitespace.
 * @throws RangeError If `config.ttlSeconds` is not a positive whole number, or is too large for the
 * expiry to be a valid `Date`.
 */
export function assertValidMidnightConfig(
  config: MidnightConfig | null | undefined,
  source = 'providers.config'
): asserts config is MidnightConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError(`${source} is missing. Pass { networkId, ttlSeconds } as ${source}.`);
  }
  const { networkId, ttlSeconds } = config;
  if (typeof networkId !== 'string' || networkId.length === 0 || networkId.trim() !== networkId) {
    throw new TypeError(
      `${source}.networkId must be a non-empty string without surrounding whitespace, got ${show(networkId)}.`
    );
  }
  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < 1 ||
    Number.isNaN(new Date(Date.now() + ttlSeconds * 1000).getTime())
  ) {
    throw new RangeError(`${source}.ttlSeconds must be a positive whole number of seconds, got ${show(ttlSeconds)}.`);
  }
}

/**
 * The expiry for an intent built now: the current time plus `config.ttlSeconds`.
 *
 * @param config The config whose `ttlSeconds` is applied.
 * @throws TypeError, RangeError As {@link assertValidMidnightConfig}.
 */
export const intentTtl = (config: MidnightConfig): Date => {
  assertValidMidnightConfig(config);
  return new Date(Date.now() + config.ttlSeconds * 1000);
};
