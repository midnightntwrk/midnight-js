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
 * can union the two variants itself and narrow it with the same guard, which is
 * asserted in the typecheck suite.
 */

import { type Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import type { Ledger9DeployedContract } from './deploy-contract';
import { UnknownResultEraError } from './errors';
import type { Ledger9FoundContract } from './find-deployed-contract';
import type {
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8DeployedContract,
  Ledger8FinalizedCallTxData,
  Ledger8FinalizedMaintenanceTxData,
  Ledger8FoundContract,
  Ledger8SubmittedCallTx
} from './ledger8-contract';
import type { Ledger9FinalizedCallTxData, Ledger9FinalizedMaintenanceTxData, Ledger9SubmittedCallTx } from './tx-model';

/**
 * Restates the two members that would otherwise arrive as `any` on a widest
 * instantiation.
 *
 * A concrete result stays assignable: every `Result` and `PrivateState` is
 * assignable to `unknown`. Narrow to one era, or to a concrete instantiation,
 * to get the precise types back.
 *
 * @see {@link OverloadTyping} for why restating them is not a restriction.
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
  | WithOpaqueCircuitValues<Ledger9FinalizedCallTxData<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>>
  | Ledger8FinalizedCallTxData<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * What a submission that does not wait for finalization answers with, in
 * either era.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraSubmittedCallTx =
  | (Omit<Ledger9SubmittedCallTx<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>, 'callTxData'> & {
      readonly callTxData: WithOpaqueCircuitValues<
        Ledger9SubmittedCallTx<Contract.Any, Contract.ProvableCircuitId<Contract.Any>>['callTxData']
      >;
    })
  | Ledger8SubmittedCallTx<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

/**
 * A contract found on chain by `findDeployedContract`, in either era.
 *
 * Generic over both contract types, because a handle's call interfaces are typed by its contract:
 * a found contract is not assignable to the widest instantiation the call-result unions use.
 *
 * @typeParam C - The current-era contract.
 * @typeParam L8 - The retained-era contract.
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraFoundContract<C extends Contract.Any, L8 extends Ledger8Contract> =
  | Ledger9FoundContract<C>
  | Ledger8FoundContract<L8>;

/**
 * A contract deployed by `deployContract`, in either era.
 *
 * @typeParam C - The current-era contract.
 * @typeParam L8 - The retained-era contract.
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraDeployedContract<C extends Contract.Any, L8 extends Ledger8Contract> =
  | Ledger9DeployedContract<C>
  | Ledger8DeployedContract<L8>;

/**
 * A contract maintenance update recorded on chain, in either era. Narrowing on `era` narrows
 * `public` to that era's record; era-agnostic code reads `public` as a `FinalizedTxRead`.
 *
 * @see {@link isLedger8Result} to narrow it.
 */
export type AnyEraMaintenanceTxData = Ledger9FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData;

/**
 * What the guard narrows a result to.
 *
 * `Extract` for a union, an intersection for a value whose `era` is the whole
 * `LedgerVersion` union. DO NOT REMOVE THE TUPLE WRAPPER: it is what stops the
 * conditional distributing.
 *
 * @see {@link OverloadTyping} for why the fallback branch has to be there.
 */
type NarrowedToLedger8<T> = [Extract<T, { readonly era: 'v8' }>] extends [never]
  ? T & { readonly era: 'v8' }
  : Extract<T, { readonly era: 'v8' }>;

/**
 * Whether a result came from the RETAINED pipeline, narrowing it to that era's
 * variant.
 *
 * Reads `era`, which every result carries and which each variant declares as its
 * own literal -- so this narrows a union of any two result shapes that carry
 * the tag, not only the published unions above.
 *
 * `era` names the PIPELINE that produced the objects in the result, read off
 * the compiled artifact. It is NOT the era that recorded the transaction:
 * `public.era` answers that, and the two disagree after the fork, when a
 * retained-era call is recorded as a keep-state transaction tagged `'v9'`.
 * Branch on this one to decide which module a result's objects came from, and
 * on `era` to decide which ledger recorded it.
 *
 * @param result Any result carrying an era tag.
 * @returns `true` when the retained pipeline produced it.
 */
export const isLedger8Result = <T extends { readonly era: LedgerVersion }>(
  result: T
): result is NarrowedToLedger8<T> => {
  switch (result?.era) {
    case 'v8':
      return true;
    case CURRENT_LEDGER_VERSION:
      return false;
    default: {
      const unhandled: never = result?.era;
      throw new UnknownResultEraError(unhandled);
    }
  }
};
