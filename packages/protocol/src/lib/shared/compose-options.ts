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
import type { LedgerVersion } from './ledger-version';

/** The two transaction-envelope options every composition leg takes. */
export interface ComposeEnvelopeOptions {
  readonly networkId: string;
  readonly ttl: Date;
}

/**
 * Rejects the two envelope options the ledger accepts but should not: an
 * empty `networkId`, and a `ttl` that is not a valid instant.
 *
 * @param options The transaction-envelope options to check.
 * @param version The era every failure raised here names.
 * @throws ComposeOptionError naming option `'networkId'` for an empty network
 * id, or `'ttl'` for a `ttl` that is not a valid instant.
 * @see {@link ComposeRefusalOrder}
 */
export const assertComposeEnvelope = (options: ComposeEnvelopeOptions, version: LedgerVersion): void => {
  if (options.networkId.length === 0) {
    throw new ComposeOptionError(version, 'networkId');
  }
  if (Number.isNaN(options.ttl.getTime())) {
    throw new ComposeOptionError(version, 'ttl');
  }
};
