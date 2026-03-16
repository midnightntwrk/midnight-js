/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import { type AnyProvableCircuitId, type PrivateStateId, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { ChargedState } from '@midnight-ntwrk/onchain-runtime-v3';

import { type CallResult } from '../call';
import { type ContractProviders } from '../contract-providers';
import { CallTxFailedError, ScopedTransactionIdentityMismatchError } from '../errors';
import { type ContractStates,type PublicContractStates } from '../get-states';
import { submitTx, type SubmitTxOptions } from '../submit-tx';
import type * as Transaction from '../transaction';
import { type FinalizedCallTxData, type UnsubmittedCallTxData } from '../tx-model';

/** @internal */
export interface CachedStateIdentity {
  readonly contractAddress: string;
  readonly privateStateId?: PrivateStateId;
}

/** @internal */
export interface CachedStatesWithIdentity<PS> {
  readonly identity: CachedStateIdentity;
  readonly states: ContractStates<PS> | PublicContractStates;
}

/** @internal */
export const TypeId: Transaction.TypeId = Symbol.for('@midnight-ntwrk/midnight-js#Transaction') as Transaction.TypeId;
/** @internal */
export const Submit = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/Submit');
/** @internal */
export const MergeUnsubmittedCallTxData = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/MergeUnsubmittedCallTxData');
/** @internal */
export const CacheStates = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/CacheStates');
/** @internal */
export const GetCurrentStatesForIdentity = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/GetCurrentStatesForIdentity');

const mergeSubmitTxOptions = <PCK extends AnyProvableCircuitId>(
  current: SubmitTxOptions<PCK> | undefined,
  next: SubmitTxOptions<PCK>
): SubmitTxOptions<PCK> => {
  if (!current) {
    return next;
  }
  const circuitIds = new Set([
      ...(Array.isArray(current.circuitId) ? current.circuitId! : [current.circuitId!]),
      ...(Array.isArray(next.circuitId) ? next.circuitId! : [next.circuitId!])
    ]);

  return {
    unprovenTx: current.unprovenTx.merge(next.unprovenTx),
    circuitId: Array.from(circuitIds)
  };
};

/** @internal */
export class TransactionContextImpl<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> implements Transaction.TransactionContext<C, PCK> {
  readonly [TypeId]: Transaction.TypeId = TypeId;
  readonly providers: ContractProviders<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  readonly options?: Transaction.ScopedTransactionOptions;

  cachedStates: CachedStatesWithIdentity<Contract.PrivateState<C>> | undefined = undefined;
  currentUnsubmittedCall: [callTxData: UnsubmittedCallTxData<C, PCK>, privateStateId?: PrivateStateId] | undefined;
  submitTxOptions: SubmitTxOptions<PCK> | undefined = undefined;

  constructor(providers: ContractProviders<C, PCK>, options?: Transaction.ScopedTransactionOptions) {
    this.providers = providers;
    this.options = options;
  }

  /**
   * @deprecated This method bypasses identity validation and may return states from a different
   * contract or private state ID than expected. Use {@link GetCurrentStatesForIdentity} instead
   * for validated access to cached states within scoped transactions.
   */
  getCurrentStates(): ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined {
    return this.cachedStates?.states;
  }

  [GetCurrentStatesForIdentity](
    identity: CachedStateIdentity
  ): ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined {
    if (!this.cachedStates) {
      return undefined;
    }
    const cached = this.cachedStates.identity;
    if (cached.contractAddress !== identity.contractAddress || cached.privateStateId !== identity.privateStateId) {
      throw new ScopedTransactionIdentityMismatchError(
        { contractAddress: cached.contractAddress, privateStateId: cached.privateStateId },
        { contractAddress: identity.contractAddress, privateStateId: identity.privateStateId }
      );
    }
    return this.cachedStates.states;
  }

  getLastUnsubmittedCallTxDataToTransact(): [UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined {
    return this.currentUnsubmittedCall;
  }

  async [Submit](): Promise<FinalizedCallTxData<C, PCK>> {
    const [unprovenCallTxData, privateStateId] = this.getLastUnsubmittedCallTxDataToTransact() ?? [];
    if (!unprovenCallTxData) {
      throw new Error('No calls were submitted.');
    }
    const finalizedTxData = await submitTx(this.providers, this.submitTxOptions!);
    if (finalizedTxData.status !== SucceedEntirely) {
      throw new CallTxFailedError(finalizedTxData, this.submitTxOptions!.circuitId!);
    }
    if (privateStateId) {
      await this.providers.privateStateProvider!.set(privateStateId, unprovenCallTxData.private.nextPrivateState);
    }
    return {
      private: unprovenCallTxData.private,
      public: {
        ...unprovenCallTxData.public,
        ...finalizedTxData
      }
    }
  }

  [CacheStates](states: ContractStates<Contract.PrivateState<C>> | PublicContractStates, identity: CachedStateIdentity): void {
    this.cachedStates = { states, identity };
  }

  [MergeUnsubmittedCallTxData](circuitId: PCK, callData: UnsubmittedCallTxData<C, PCK>, privateStateId?: PrivateStateId): void {
    this.currentUnsubmittedCall = [callData, privateStateId];
    this.submitTxOptions = mergeSubmitTxOptions(
      this.submitTxOptions,
      {
        unprovenTx: callData.private.unprovenTx,
        circuitId
       }
    );

    // If there is no currently cached state, then return...
    if (!this.cachedStates) return;

    // ...otherwise apply the changes in `callData` to the cached state, preserving the identity.
    const privateState = callData.private.nextPrivateState;
    const contractState = this.cachedStates.states.contractState;
    const zswapChainState = this.cachedStates.states.zswapChainState; // Preserve the current Zswap chain state.
    const ledgerParameters = this.cachedStates.states.ledgerParameters; // Preserve the current ledger parameters.

    contractState.data = new ChargedState(callData.public.nextContractState);

    this[CacheStates]({ contractState, zswapChainState, ledgerParameters, privateState }, this.cachedStates.identity);
  }
}

/** @internal */
export const mergeUnsubmittedCallTxData = <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
>(
  txCtx: Transaction.TransactionContext<C, PCK>,
  circuitId: PCK,
  callData: UnsubmittedCallTxData<C, PCK>,
  privateStateId?: PrivateStateId
): void => {
  txCtx[MergeUnsubmittedCallTxData](circuitId, callData, privateStateId);
};

/** @internal */
export const isTransactionContext = (u: unknown): u is Transaction.TransactionContext<Contract.Any> =>
  typeof u === "object" && u != null && TypeId in u;

/** @internal */
export const scoped: {
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
    options?: Transaction.ScopedTransactionOptions,
  ): Promise<FinalizedCallTxData<C, PCK>>,
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
    txCtx: Transaction.TransactionContext<C, PCK>,
    options?: Transaction.ScopedTransactionOptions
  ): Promise<CallResult<C, PCK>>
} = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
  txCtxOrOptions?: Transaction.TransactionContext<C, PCK> | Transaction.ScopedTransactionOptions,
  options?: Transaction.ScopedTransactionOptions
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const outerTxCtx = isTransactionContext(txCtxOrOptions) ? txCtxOrOptions : undefined;
  const txOptions = isTransactionContext(txCtxOrOptions)
    ? options
    : txCtxOrOptions as Transaction.ScopedTransactionOptions | undefined;
  const innerTxCtx = outerTxCtx ?? new TransactionContextImpl<C, PCK>(providers, txOptions);

  try {
    await fn(innerTxCtx);
  } catch (err: unknown) {
    if (outerTxCtx) {
      throw err;
    }
    const execErr = new Error(
      `Unexpected error executing scoped transaction '${options?.scopeName ?? '<unnamed>'}': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(
      providers.loggerProvider,
      execErr.message
    );
    throw execErr;
  }
  try {
    // Only submit when there is no outer transaction context (i.e., no parent transaction context, meaning
    // that this is the root transaction context).
    if (!outerTxCtx) {
      return await innerTxCtx[Submit]();
    }

    // ...otherwise, return the `CallResult` from the last submitted call within the scope of the transaction context.
    const [unprovenCallTxData] = innerTxCtx.getLastUnsubmittedCallTxDataToTransact() ?? [];
    if (!unprovenCallTxData) {
      //disable-next-line: no-throw-literal
      throw new Error('No calls were submitted.');
    }
    return {
      public: {
        nextContractState: unprovenCallTxData.public.nextContractState,
        partitionedTranscript: unprovenCallTxData.public.partitionedTranscript,
        publicTranscript: unprovenCallTxData.public.publicTranscript
      },
      private: {
        input: unprovenCallTxData.private.input,
        output: unprovenCallTxData.private.output,
        privateTranscriptOutputs: unprovenCallTxData.private.privateTranscriptOutputs,
        result: unprovenCallTxData.private.result,
        nextPrivateState: unprovenCallTxData.private.nextPrivateState,
        nextZswapLocalState: unprovenCallTxData.private.nextZswapLocalState
      }
    } as CallResult<C, PCK>;
  } catch (err: unknown) {
    // Rethrow known call transaction failures and errors occurring within an outer transaction context...
    if (err instanceof CallTxFailedError || outerTxCtx) {
      throw err;
    }
    // ...otherwise, wrap and rethrow errors occurring during submission at the root transaction context.
    const submitErr = new Error(
      `Unexpected error submitting scoped transaction '${options?.scopeName ?? '<unnamed>'}': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(
      providers.loggerProvider,
      submitErr.message
    );
    throw submitErr;
  }
};
