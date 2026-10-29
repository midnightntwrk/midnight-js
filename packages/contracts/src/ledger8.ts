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

/**
 * The refusals the RETAINED era raises, under one name.
 *
 * The barrel re-exports this module as `Ledger8`, so a caller writes
 * `Ledger8.CallTxFailedError`. The era prefix is dropped inside, because the namespace already
 * carries it -- so a declaration this reference calls `Ledger8X` is the member published as
 * `Ledger8.X`.
 *
 * Only error classes live here. The retained era's types are flat `Ledger8*` exports: the entry
 * points return them by their declared names, and a type reachable only through a namespace cannot
 * be named in a dApp's declaration emit (TS4023). An error class reaches a consumer only through
 * the consumer's own `Ledger8.X`, which the compiler can always print back.
 *
 * @see {@link RetainedEraNamespace} for what qualifies, what stays flat, and
 *      how the surface is withdrawn.
 */

export {
  Ledger8AmbiguousEntryPointError as AmbiguousEntryPointError,
  Ledger8ArtifactOnLedger9StateError as ArtifactOnLedger9StateError,
  Ledger8CallTxFailedError as CallTxFailedError,
  Ledger8ContractStateUnsupportedError as ContractStateUnsupportedError,
  Ledger8DeployNotStoredError as DeployNotStoredError,
  Ledger8DeployOnLedger9Error as DeployOnLedger9Error,
  Ledger8DeployTxFailedError as DeployTxFailedError,
  Ledger8DeployUnconfirmedError as DeployUnconfirmedError,
  Ledger8MaintenanceOnLedger9Error as MaintenanceOnLedger9Error,
  Ledger8RecipientUnmappableError as RecipientUnmappableError,
  Ledger8ReplaceAuthorityUnconfirmedError as ReplaceAuthorityUnconfirmedError,
  Ledger8ShieldedSpendUnsupportedError as ShieldedSpendUnsupportedError,
  Ledger8SigningKeyNotStoredError as SigningKeyNotStoredError,
  Ledger8SigningKeyUnavailableError as SigningKeyUnavailableError,
  Ledger8SigningKeyUnusableError as SigningKeyUnusableError
} from './errors';
export {
  Ledger8InsertVerifierKeyTxFailedError as InsertVerifierKeyTxFailedError,
  Ledger8RemoveVerifierKeyTxFailedError as RemoveVerifierKeyTxFailedError,
  Ledger8ReplaceMaintenanceAuthorityTxFailedError as ReplaceMaintenanceAuthorityTxFailedError
} from './governance/errors';
