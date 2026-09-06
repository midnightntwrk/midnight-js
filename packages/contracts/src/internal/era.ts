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

import {
  type LedgerEra,
  type LedgerVersion,
  loadLedgerEra,
  networkHeadVersion,
  protocolVersionToLedger,
  UnknownLedgerVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
import {
  type FinalizedTxData,
  type PublicDataProvider,
  type RawContractState,
  UntaggedPayloadError,
  type VersionedFinalizedTxData,
  type VersionedTx
} from '@midnight-ntwrk/midnight-js-types';
import { contractStateEnvelopeVersion } from '@midnight-ntwrk/midnight-js-utils';

import {
  EraArtifactMismatchError,
  EraInvariantViolationError,
  type EraSeam,
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error
} from '../errors';
import type { Ledger8Contract } from '../ledger8-contract';

/**
 * Unwraps the v9 arm of a versioned payload a provider returned. The flows in
 * this package only ever send v9 payloads, so a v8 response cannot be handled.
 *
 * @see {@link EraDispatch} for why a v8 answer here is a broken provider rather
 *      than an unsupported request.
 *
 * @param payload The payload a provider returned.
 * @param seam The provider method that returned it.
 * @param circuitId The circuit, or circuits, this flow is running, for the error message.
 * @returns The live v9 ledger transaction.
 * @throws EraInvariantViolationError if the payload carries the v8 arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireV9<T>(
  payload: VersionedTx<T>,
  seam: EraSeam,
  circuitId?: string | readonly string[]
): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  switch (payload.version) {
    case 'v9':
      return payload.tx;
    case 'v8':
      throw new EraInvariantViolationError(seam, circuitId);
    default: {
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}

/**
 * Unwraps the RETAINED arm of a versioned payload a provider returned, on a
 * flow that submitted the retained arm.
 *
 * The mirror of {@link requireV9}, and it exists for the same reason: the seam
 * types do not tie a provider's output era to its input era, so a flow that
 * submitted retained-era bytes has to check that retained-era bytes came back.
 *
 * Note which refusal is NOT this function's. A provider that does not handle
 * the retained arm at all rejects it on the way IN, with
 * `V8PayloadUnsupportedError` from `unwrapV9` in
 * `@midnight-ntwrk/midnight-js-types` — that is the inbound guard a
 * current-era-only provider implementation runs, and it is deliberately left
 * where it is so a retained-era submit against a provider that has not been
 * widened fails with one coherent typed refusal at the seam it entered, rather
 * than part-way through a submit with a transaction already composed. This
 * function only catches the other case: a provider that ACCEPTED the retained
 * payload and answered in the current era.
 *
 * @param payload The payload a provider returned.
 * @param seam The provider method that returned it.
 * @param circuitId The circuit, or circuits, this flow is running, for the error message.
 * @returns The serialized retained-era transaction bytes.
 * @throws EraInvariantViolationError if the payload carries the current-era arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireV8<T>(
  payload: VersionedTx<T>,
  seam: EraSeam,
  circuitId?: string | readonly string[]
): Uint8Array {
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  switch (payload.version) {
    case 'v8':
      return payload.txBytes;
    case 'v9':
      throw new EraInvariantViolationError(seam, circuitId, 'v8');
    default: {
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}

/**
 * Narrows a finalized-transaction record from the read surface to its v9 arm.
 *
 * @see {@link EraDispatch} for why the v9-only flows reject here rather than
 *      widening their own public return types.
 *
 * @param record The record the read surface returned.
 * @param seam The read-surface method that returned it.
 * @param circuitId The circuit, or circuits, this flow is running, for the error message.
 * @returns The v9 finalized-transaction record.
 * @throws EraInvariantViolationError if the record carries the v8 arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireV9Record(
  record: VersionedFinalizedTxData,
  seam: EraSeam,
  circuitId?: string | readonly string[]
): FinalizedTxData {
  if (typeof record !== 'object' || record === null) {
    throw new UntaggedPayloadError(seam, record);
  }
  switch (record.version) {
    case 'v9':
      return record;
    case 'v8':
      throw new EraInvariantViolationError(seam, circuitId);
    default: {
      const unhandled: never = record;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}

/**
 * Which execution pipeline an operation takes.
 *
 * `'ledger8'` is the retained pipeline, for a contract produced by the previous Compact
 * toolchain; `'v9native'` is the current one. Both names are the LEDGER ERA the pipeline executes
 * against, never a toolchain version.
 *
 * Not a statement about the network — see {@link assertEraCompatible} for the pairing with the
 * head era, which is what decides whether the operation can run at all.
 *
 * @see {@link EraDispatch} for why the names are keyed to the ledger era.
 */
export type PipelineEra = 'ledger8' | 'v9native';

/**
 * The era facts one operation resolves ONCE, at its asynchronous start, and then threads down as
 * a plain value.
 *
 * A named type rather than an anonymous return shape because it is threaded through the operation
 * rather than consumed at the call site, and everything downstream has to name what it received.
 *
 * @see {@link EraDispatch} for why this is per-operation and never cached across operations.
 */
export interface ResolvedOperationEra extends HeadEraReading {
  /** The era facade bound to {@link HeadEraReading.head}, acquired once so nothing downstream awaits an era. */
  readonly era: LedgerEra;
}

/**
 * ONE reading of the network head, resolved to an era — and NOTHING acquired yet.
 *
 * The half of {@link ResolvedOperationEra} that costs one network round trip and no runtime
 * instantiation. Separate from the whole because acquiring an era is a lazy RUNTIME LOAD: for the
 * pre-fork era it reaches that ledger's own subpath and instantiates its WASM. A caller that only
 * has to decide whether it can proceed against this head must be able to decide it from the reading
 * alone, before paying for a runtime it may be about to refuse — and without its refusal being
 * replaced by an acquisition failure when that subpath cannot be loaded at all
 * (`docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`).
 */
export interface HeadEraReading {
  /** The ledger era the network head is on, as resolved at this operation's start. */
  readonly head: LedgerVersion;
  /**
   * The raw head `protocolVersion` integer {@link HeadEraReading.head} was resolved from.
   *
   * Retained alongside the era because the integer distinguishes node minor versions that the era
   * deliberately collapses.
   */
  readonly headProtocolVersion: number;
}

/**
 * The one read {@link resolveOperationEra} and {@link assertHeadStateEraAgreement} make on the
 * public data provider.
 *
 * Declared as a `Pick` of the real provider rather than as the whole interface: a full
 * `PublicDataProvider` satisfies it, so nothing at a call site changes, while a test — and a
 * reader — sees exactly which member is consulted.
 */
export type HeadVersionSource = Pick<PublicDataProvider, 'queryLatestProtocolVersion'>;

// The `constructor.name` values that separate the two eras' generated code, asserted against real
// compiled contracts by `src/test/era-dispatch-ledger8.test.ts` and `src/test/era-dispatch.test.ts`.
// Match `PLAIN_FUNCTION` POSITIVELY -- never as "anything that is not async", which would fail open.
const PLAIN_FUNCTION = 'Function';
const ASYNC_FUNCTION = 'AsyncFunction';

/**
 * Whether `value` carries `key` as its OWN property, narrowing `value` so the property can then be
 * read without a cast.
 *
 * `Object.hasOwn` rather than `in`: a discriminator that must survive an object spread has to be an
 * own property.
 *
 * @see {@link EraDispatch} for which checks can be own and which one cannot.
 */
const hasOwnProperty = <K extends string>(value: object, key: K): value is object & Record<K, unknown> =>
  Object.hasOwn(value, key);

/**
 * Decides which pipeline a caller's contract belongs to, from the object itself.
 *
 * A STRUCTURAL check, and it must not be "improved" to test the vendor's registered
 * `CompiledContract` brand: that brand sits on a prototype the container's own combinators drop,
 * so a brand test reports `false` for every real current-era caller.
 * `src/test/era-dispatch.test.ts` pins that.
 *
 * @param compiledContract The value a caller passed as its contract. `unknown`, because a
 * JavaScript caller can pass anything and the point of this function is to say what it passed.
 * @returns The pipeline that contract belongs to.
 * @throws EraArtifactMismatchError with reason `'unwrapped-current-era-contract'` for a raw
 * current-era contract instance, and `'unrecognised-contract-shape'` for an object matching
 * neither era.
 * @see {@link EraDispatch} for the shape table each branch below implements, the brand-loss
 * measurement, and why `initialState` is the one check that is not an own-property check.
 */
export const pipelineEraOf = (compiledContract: unknown): PipelineEra => {
  if (typeof compiledContract !== 'object' || compiledContract === null) {
    throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }

  if (!hasOwnProperty(compiledContract, 'impureCircuits')) {
    // The container carries a `tag` and none of the circuit collections. Requiring the `tag` as
    // well as the absence of `impureCircuits` is what stops an arbitrary object — `{}` included —
    // from being routed into the current-era pipeline by default.
    if (hasOwnProperty(compiledContract, 'tag') && typeof compiledContract.tag === 'string') {
      return 'v9native';
    }
    throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }

  // Read through the prototype chain on purpose: `initialState` is a class method. Bound to a local
  // so the `typeof` narrowing below is on a value rather than on a property path.
  const initialState: unknown = 'initialState' in compiledContract ? compiledContract.initialState : undefined;
  if (typeof initialState !== 'function') {
    throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }

  switch (initialState.constructor.name) {
    case PLAIN_FUNCTION:
      return 'ledger8';
    case ASYNC_FUNCTION:
      throw new EraArtifactMismatchError('unwrapped-current-era-contract');
    default:
      // A codegen shape neither era produces. Refused rather than routed anywhere by default.
      throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }
};

/**
 * {@link pipelineEraOf}, in the narrowing form each era-dispatching entry point needs.
 *
 * Not a second predicate: the decision is made in exactly one place, and this only gives it a type
 * predicate so an entry point's body can drop the retained-era arm from its parameter union without
 * a cast.
 *
 * Name the type parameter explicitly at each call site rather than letting it infer, so the
 * narrowing removes exactly the retained-era arm of that entry point's parameter union.
 *
 * @see {@link EraDispatch} for the provisional check this replaces and the failure mode that
 *      changed with it.
 *
 * @param options The options object an entry point received.
 * @returns Whether this is a retained-era request.
 * @throws EraArtifactMismatchError if the contract belongs to neither era, or is a raw current-era
 * contract passed instead of its container.
 */
export const isLedger8Request = <L extends { readonly compiledContract: Ledger8Contract }>(
  options: { readonly compiledContract: unknown } | L
): options is L => pipelineEraOf(options.compiledContract) === 'ledger8';

/**
 * Makes the ONE head read and resolves it to an era, acquiring nothing.
 *
 * The first half of {@link resolveOperationEra}, split out so a caller that may REFUSE this head can
 * decide that from the reading alone. Acquiring first would make the refusal cost a runtime
 * instantiation it then discards, and would make the refusal depend on that instantiation
 * succeeding — so a caller whose whole point is that it never touches the other era would be told
 * to go and acquire it.
 *
 * Both fields come from the same reading, which is the invariant
 * {@link resolveOperationEra} exists to hold: two reads could answer differently during the fork
 * window and leave one operation built half against each era.
 *
 * @param pdp The read surface to ask for the network head.
 * @returns The head era and the integer it was resolved from.
 * @throws UnknownProtocolVersionError tagged with the `construct` path when the head integer cannot
 * be placed on the era timeline. A rejection from the provider propagates unchanged.
 */
export const readHeadEra = async (pdp: HeadVersionSource): Promise<HeadEraReading> => {
  const headProtocolVersion = await pdp.queryLatestProtocolVersion();

  return { headProtocolVersion, head: protocolVersionToLedger(headProtocolVersion, 'construct') };
};

/**
 * Acquires the era facade for a head reading already taken.
 *
 * The second half of {@link resolveOperationEra}. Acquired at the operation's asynchronous start, so
 * every era operation downstream is synchronous and nothing deeper in the pipeline has to await a
 * runtime -- see the era-seam document under `packages/protocol/docs/`.
 *
 * The SINGLE acquisition site for these flows: `readHeadEra` above deliberately does not acquire,
 * and every caller that needs a facade comes through here, so there is exactly one place a lazy
 * era load happens and exactly one place the integer-to-era mapping happens.
 *
 * @param reading The head reading to bind an era to.
 * @returns The reading, with the era facade bound to it.
 * @throws Ledger8RuntimeMissingError if the retained runtime cannot be acquired.
 */
export const acquireHeadEra = async (reading: HeadEraReading): Promise<ResolvedOperationEra> => ({
  ...reading,
  era: await loadLedgerEra(reading.head)
});

/**
 * Resolves the era facts one operation runs against, with EXACTLY ONE head read.
 *
 * The single read is the whole point: two round trips can answer differently inside the fork
 * window, leaving one operation built half against each era. Nothing is cached across calls.
 *
 * @see {@link EraDispatch} for both rules and what they cost if broken.
 *
 * @param pdp The read surface to ask for the network head.
 * @returns The head era, the integer it was resolved from, and the era facade bound to it.
 * @throws UnknownProtocolVersionError tagged with the `construct` path when the head integer
 * cannot be placed on the era timeline. A rejection from the provider propagates unchanged.
 */
export const resolveOperationEra = async (pdp: HeadVersionSource): Promise<ResolvedOperationEra> =>
  acquireHeadEra(await readHeadEra(pdp));

/**
 * Refuses an operation whose artifact era and network head era cannot be run together.
 *
 * Holds the whole dispatch table, and every cell is ruled rather than left to fall through. A
 * retained-era DEPLOY on a post-fork head is the one cell where calls and deploys differ.
 *
 * Returns nothing. Which pipeline runs is the `(pipeline, head)` pair the caller already holds;
 * this decides only whether that pair may run, so it does not restate the pair as a third value
 * that could disagree with it.
 *
 * @see {@link EraDispatch} for the table in full and why the deploy cell differs.
 *
 * @param pipeline The pipeline the artifact belongs to, from {@link pipelineEraOf}.
 * @param head The era the network head is on, from {@link resolveOperationEra}.
 * @param kind Whether this operation deploys a contract or calls one already deployed.
 * @throws EraArtifactMismatchError with reason `'current-era-artifact-on-pre-fork-head'` for a
 * current-era artifact on a pre-fork head.
 * @throws Ledger8DeployOnV9Error for a retained-era deploy on a post-fork head.
 * @throws UnknownLedgerVersionError if a ledger era is added without a cell here.
 */
export const assertEraCompatible = (pipeline: PipelineEra, head: LedgerVersion, kind: 'call' | 'deploy'): void => {
  switch (pipeline) {
    case 'v9native':
      switch (head) {
        case 'v9':
          return;
        case 'v8':
          throw new EraArtifactMismatchError('current-era-artifact-on-pre-fork-head');
        default: {
          // The runtime throw is not redundant with the compile-time gate: a new era reaches here
          // from a real head integer before this switch is updated.
          const unhandled: never = head;
          throw new UnknownLedgerVersionError(String(unhandled));
        }
      }
    case 'ledger8':
      switch (head) {
        case 'v9':
          if (kind === 'deploy') {
            throw new Ledger8DeployOnV9Error();
          }
          return;
        case 'v8':
          return;
        default: {
          const unhandled: never = head;
          throw new UnknownLedgerVersionError(String(unhandled));
        }
      }
    default: {
      const unhandled: never = pipeline;
      throw new UnknownLedgerVersionError(String(unhandled));
    }
  }
};

/**
 * Refuses an operation whose network head and fetched contract state belong to different ledger
 * eras.
 *
 * `RawContractState.version` cannot answer this: it is derived from the record's `protocolVersion`
 * alone and is explicitly not a verified statement about the envelope the bytes carry (see its own
 * documentation in `packages/types/src/raw-contract-state.ts`). This closes that gap by reading the
 * envelope.
 *
 * THE ORDER OF THE FIVE STEPS BELOW IS LOAD-BEARING. Do not reorder them, and do not declare the
 * tag-to-era mapping here — it lives once, as `contractStateEnvelopeVersion` in
 * `@midnight-ntwrk/midnight-js-utils`.
 *
 * @see {@link EraDispatch} for what each step buys and what breaks if it moves.
 *
 * @param head The era the operation resolved from the network head.
 * @param state The raw contract state the operation fetched, envelope included.
 * @param pdp The read surface, for the fresh head read step 3 needs.
 * @throws TagParseError if `state.raw` carries no supported contract-state envelope.
 * @throws Error, carrying the transport failure on `cause`, if the fresh head read rejects — so the
 * disagreement that was under investigation is not lost behind a bare transport error.
 * @throws HeadStateEraMismatchError if a fresh head read agrees with the state's era.
 * @throws IndexerInconsistencyError if a fresh head read still disagrees with it.
 */
export const assertHeadStateEraAgreement = async (
  head: LedgerVersion,
  state: RawContractState,
  pdp: HeadVersionSource
): Promise<void> => {
  const stateEra = contractStateEnvelopeVersion(state.raw);
  if (stateEra === head) {
    return;
  }

  let freshHead: LedgerVersion;
  try {
    freshHead = await networkHeadVersion(pdp);
  } catch (cause) {
    // Nothing is swallowed -- the transport failure propagates on `cause` -- but on its own it
    // carries no trace that an era disagreement was under investigation.
    throw new Error(
      `Could not re-read the network head while checking a '${head}'-era head reading against a ` +
        `'${stateEra}'-era contract state envelope. Whether those two disagree is still unresolved, so ` +
        `this operation is refused rather than run against a guess. Retry once the read surface is reachable.`,
      { cause }
    );
  }

  if (freshHead !== stateEra) {
    throw new IndexerInconsistencyError(freshHead, stateEra);
  }
  throw new HeadStateEraMismatchError(head, stateEra);
};
