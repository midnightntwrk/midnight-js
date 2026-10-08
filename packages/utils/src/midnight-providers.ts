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

import { ConfigurationError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

import { assertValidMidnightConfig } from './midnight-config';

const REQUIRED_PROVIDERS = [
  'privateStateProvider',
  'publicDataProvider',
  'zkConfigProvider',
  'proofProvider',
  'walletProvider',
  'midnightProvider'
] as const;

/**
 * Checks a provider set the dApp built and returns it unchanged, so a broken set fails at
 * application start instead of at the first operation.
 *
 * @param providers The provider set to check.
 * @returns The same `providers` object.
 * @throws ConfigurationError If a required provider is missing, or as {@link assertValidMidnightConfig}.
 * @throws InvalidArgumentError As {@link assertValidMidnightConfig}.
 */
export const createMidnightProviders = <P extends MidnightProviders>(providers: P): P => {
  for (const key of REQUIRED_PROVIDERS) {
    if (typeof providers[key] !== 'object' || providers[key] === null) {
      throw new ConfigurationError(`providers.${key} is missing.`);
    }
  }
  assertValidMidnightConfig(providers.config);
  return providers;
};
