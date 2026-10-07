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

import type { MidnightConfig, NetworkId } from '@midnight-ntwrk/midnight-js-types';

const requireConfig = (config: MidnightConfig | undefined): MidnightConfig => {
  if (config === undefined) {
    throw new TypeError('providers.config is missing. Pass { networkId, ttlSeconds } as providers.config.');
  }
  return config;
};

export const networkIdOf = (config: MidnightConfig | undefined): NetworkId => {
  const { networkId } = requireConfig(config);
  if (typeof networkId !== 'string' || networkId.length === 0) {
    throw new TypeError(`MidnightConfig.networkId must be a non-empty string, got ${JSON.stringify(networkId)}.`);
  }
  return networkId;
};

export const intentTtl = (config: MidnightConfig | undefined, now: number = Date.now()): Date => {
  const { ttlSeconds } = requireConfig(config);
  const invalid = () =>
    new RangeError(`MidnightConfig.ttlSeconds must be a positive whole number of seconds, got ${String(ttlSeconds)}.`);
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw invalid();
  const expiry = new Date(now + ttlSeconds * 1000);
  if (Number.isNaN(expiry.getTime())) throw invalid();
  return expiry;
};
