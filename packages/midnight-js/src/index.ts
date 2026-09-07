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

export * as contracts from '@midnight-ntwrk/midnight-js-contracts';
export * as networkId from '@midnight-ntwrk/midnight-js-network-id';
export * as types from '@midnight-ntwrk/midnight-js-types';
export * as utils from '@midnight-ntwrk/midnight-js-utils';

// The era vocabulary: what a consumer needs to say which ledger produced a
// payload or a record, and to handle the failure when that resolution has no
// answer. Which names qualify, what importing the barrel does and does not
// cost, and why these come off leaf subpaths rather than protocol's root
// barrel are all recorded in BarrelPublishedSurface.
export {
  LEDGER_VERSIONS,
  type LedgerVersion,
  networkHeadVersion,
  type ProtocolVersionSource,
  type VersionedRecord,
  versionOfRecord
} from '@midnight-ntwrk/midnight-js-protocol/version';

// The resolvers above reject or throw with `UnknownProtocolVersionError`. The
// remaining classes are the protocol errors that reach a barrel consumer
// unwrapped through `contracts`; each travels with the code it carries and the
// types its payload names, so one can catch by class and read the payload
// without a cast. `PayloadNotATransactionError` arrives as a `proveTx`
// rejection rather than from the era pipeline, and has a private constructor:
// it is published to be caught, not built. See BarrelPublishedSurface.
export {
  ComposeFailedError,
  type ComposeOption,
  ComposeOptionError,
  type ComposeStage,
  Ledger8RuntimeMissingError,
  PayloadNotATransactionError,
  PROTOCOL_ERROR_CODES,
  type ProtocolVersionUnknownReason,
  type RetainedEraSubpath,
  StateDecodeFailedError,
  UnknownLedgerVersionError,
  UnknownProtocolVersionError,
  type VersionResolutionPath
} from '@midnight-ntwrk/midnight-js-protocol/errors';

// No `protocol/v8` re-export in any form, in either block above: the retained
// pre-fork runtime is reachable only through the loaders that dynamically
// import it -- see docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md.
// `src/test/dist-laziness.test.ts` is what holds that in place.
