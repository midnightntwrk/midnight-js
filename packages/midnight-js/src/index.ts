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
// payload or a record, to resolve one from a raw `protocolVersion`, and to
// handle the failure when that resolution has no answer.
//
// Inclusion rule for the type-only names below: a type is published here when
// it is named in the public shape of a value published here -- the parameters
// of an exported function (optional ones included), its return type, or a
// public field of the exported error class. That is why `VersionResolutionPath`
// is present (second parameter of `protocolVersionToLedger`, and the error's
// `path`) and `ProtocolErrorCode` is not: nothing on this surface names it, and
// discriminating goes through the `PROTOCOL_ERROR_CODES` members, which carry
// their own literal types.
//
// Named re-exports off the `protocol/version` subpath rather than a whole
// `protocol` namespace. `version` reaches exactly two modules of its own,
// `protocol/errors` and the `ledger-version` declaration the two share, and
// neither pulls anything further at runtime. Protocol's root barrel by
// contrast eagerly pulls the ledger, onchain-runtime, compact-js and platform
// bindings -- a cost this package's own dependencies happen to pay today, but
// one nothing on this surface needs, and one the barrel must not pin in
// place.
//
// Deliberately no `protocol/v8` re-export in any form: the retained pre-fork
// runtime stays off every consumer's eager path, reached only through the
// loaders that dynamically import it.
export {
  LEDGER_VERSIONS,
  type LedgerVersion,
  networkHeadVersion,
  type ProtocolVersionSource,
  protocolVersionToLedger,
  type VersionedRecord,
  versionOfRecord
} from '@midnight-ntwrk/midnight-js-protocol/version';

// The three resolvers above all throw this one error, so it travels with them:
// published together, a consumer can catch it, tell it apart with
// `utils.hasErrorCode`, and narrow on `path`/`reason` without hardcoding a code
// string. `protocol/errors` imports nothing at runtime, and `protocol/version`
// already pulls it, so this adds no module to the graph.
export {
  PROTOCOL_ERROR_CODES,
  type ProtocolVersionUnknownReason,
  UnknownProtocolVersionError,
  type VersionResolutionPath
} from '@midnight-ntwrk/midnight-js-protocol/errors';
