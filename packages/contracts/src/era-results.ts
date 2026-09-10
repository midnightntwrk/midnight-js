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
 * The union of what a call entry point can answer with across both eras, and
 * the guard that narrows it.
 *
 * The entry-point overloads select ONE era's result type by inference, which is
 * what a caller making a call wants. A caller RECEIVING a result is in the
 * opposite position: a telemetry sink, a retry handler, a queue consumer or a
 * logger is handed whatever the call produced and has to declare a parameter
 * that accepts both eras. Inference cannot express that, and `era` alone does
 * not help until the union has a name.
 *
 * These are the WIDEST instantiations. A generic union over both eras would
 * need four type parameters -- a contract and a circuit id per era -- which is
 * a signature nobody writes; a caller that does hold concrete contract types
 * can union the two arms itself and narrow it with the same guard, which is
 * asserted in the typecheck suite.
 */

import { type Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import { type PipelineEra, RETAINED_PIPELINE_ERA, type RetainedPipelineEra } from './era';
import type {
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8FinalizedCallTxData,
  Ledger8SubmittedCallTx
} from './ledger8-contract';
import type { FinalizedCallTxData, SubmittedCallTx } from './tx-model';

/**
 * What a finalizing call answers with, in either era.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraFinalizedCallTxData =
  | FinalizedCallTxData<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>
  | Ledger8FinalizedCallTxData<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * What a submission that does not wait for finalization answers with, in
 * either era.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraSubmittedCallTx =
  | SubmittedCallTx<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>
  | Ledger8SubmittedCallTx<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * Whether a result came from the RETAINED pipeline, narrowing it to that era's
 * arm.
 *
 * Reads `era`, which every result carries and which each arm declares as its
 * own literal -- so this narrows a union of any two result shapes that carry
 * the tag, not only the published unions above.
 *
 * `era` names the PIPELINE that produced the objects in the result, read off
 * the compiled artifact. It is NOT the era that recorded the transaction:
 * `public.version` answers that, and the two disagree after the fork, when a
 * retained-era call is recorded as a keep-state transaction tagged `'v9'`.
 * Branch on this one to decide which module a result's objects came from, and
 * on `version` to decide which ledger recorded it.
 *
 * @param result Any result carrying an era tag.
 * @returns `true` when the retained pipeline produced it.
 */
export const isLedger8Result = <T extends { readonly era: PipelineEra }>(
  result: T
): result is Extract<T, { readonly era: RetainedPipelineEra }> => result.era === RETAINED_PIPELINE_ERA;
