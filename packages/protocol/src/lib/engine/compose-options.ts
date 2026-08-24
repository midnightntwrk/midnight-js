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

import { ComposeOptionError } from '../../errors';
import type { LedgerVersion } from '../ledger-version';

/** The two transaction-envelope options every composition leg takes. */
export interface ComposeEnvelopeOptions {
  readonly networkId: string;
  readonly ttl: Date;
}

/**
 * Rejects the two envelope options the ledger accepts but should not: an
 * empty `networkId`, and a `ttl` that is not a valid instant. Both are
 * silently absorbed by the WASM — an empty network id is baked into the
 * transaction, and an Invalid Date is recorded as the Unix epoch, yielding a
 * transaction that has already expired the moment it is composed. Neither
 * surfaces until submission, so both are refused here.
 *
 * This validates well-formedness only, never policy: which network a
 * deployment targets and how long a transaction should live remain the
 * caller's decisions.
 */
export const assertComposeEnvelope = (options: ComposeEnvelopeOptions, version: LedgerVersion): void => {
  if (options.networkId.length === 0) {
    throw new ComposeOptionError(version, 'networkId');
  }
  if (Number.isNaN(options.ttl.getTime())) {
    throw new ComposeOptionError(version, 'ttl');
  }
};
