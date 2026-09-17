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

import { CURRENT_PIPELINE_ERA, type PipelineEra, RETAINED_PIPELINE_ERA, type RetainedPipelineEra } from './era';
import { UnrecognisedResultEraError } from './errors';
import type {
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8FinalizedCallTxData,
  Ledger8SubmittedCallTx
} from './ledger8-contract';
import type { FinalizedCallTxData, SubmittedCallTx } from './tx-model';

/**
 * Restates the two members that would otherwise arrive as `any` on a widest
 * instantiation.
 *
 * `Contract.Any` is `Contract<any>`, so `Contract.PrivateState<Contract.Any>`
 * and `Contract.CircuitReturnType<Contract.Any, string>` both resolve to
 * `any`. Published unnarrowed, that hands a shared handler two members with
 * checking switched off -- and a shared handler is precisely what these unions
 * exist for. The retained arm answers `unknown` for both, so this is what puts
 * the two arms on the same footing rather than a restriction on one.
 *
 * A concrete result stays assignable: every `Result` and `PrivateState` is
 * assignable to `unknown`. Narrow to one era, or to a concrete instantiation,
 * to get the precise types back.
 */
type WithOpaqueCircuitValues<T extends { readonly private: object }> = Omit<T, 'private'> & {
  readonly private: Omit<T['private'], 'nextPrivateState' | 'result'> & {
    readonly nextPrivateState: unknown;
    readonly result: unknown;
  };
};

/**
 * What a finalizing call answers with, in either era.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraFinalizedCallTxData =
  | WithOpaqueCircuitValues<FinalizedCallTxData<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>>
  | Ledger8FinalizedCallTxData<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * What a submission that does not wait for finalization answers with, in
 * either era.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraSubmittedCallTx =
  | (Omit<SubmittedCallTx<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>, 'callTxData'> & {
      readonly callTxData: WithOpaqueCircuitValues<
        SubmittedCallTx<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>['callTxData']
      >;
    })
  | Ledger8SubmittedCallTx<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * What the guard narrows a result to.
 *
 * `Extract` is the right answer for a UNION, and the only answer that removes
 * the other era's arm. It is the wrong answer for a value whose `era` is the
 * whole `PipelineEra` union rather than one literal: there is no member to
 * pick, so it collapses to `never` and rejects every property access in the
 * true branch. `PipelineEra` is published, so that is a parameter callers
 * write. Fall back to an intersection in exactly that case.
 *
 * The tuple wrapper stops the conditional distributing, which would otherwise
 * evaluate it once per union member and take the fallback for all of them.
 */
type NarrowedToRetained<T> = [Extract<T, { readonly era: RetainedPipelineEra }>] extends [never]
  ? T & { readonly era: RetainedPipelineEra }
  : Extract<T, { readonly era: RetainedPipelineEra }>;

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
): result is NarrowedToRetained<T> => {
  switch (result?.era) {
    case RETAINED_PIPELINE_ERA:
      return true;
    case CURRENT_PIPELINE_ERA:
      return false;
    default:
      throw new UnrecognisedResultEraError(result?.era);
  }
};
