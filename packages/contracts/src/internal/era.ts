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
  protocolVersionToLedger,
  UnknownLedgerVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
import {
  ArtifactRuntimeVersionUnavailableError,
  type FinalizedTxData,
  type PublicDataProvider,
  type RawContractState,
  UntaggedPayloadError,
  type VersionedFinalizedTxData,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { contractStateEnvelopeVersion, ZkArtifactContractInfoError } from '@midnight-ntwrk/midnight-js-utils';

import { CURRENT_PIPELINE_ERA, type PipelineEra, RETAINED_PIPELINE_ERA } from '../era';
import {
  EraArtifactMismatchError,
  EraInvariantViolationError,
  type EraSeam,
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error,
  type StaleHeadOperationKind} from '../errors';
import type { Ledger8Contract } from '../ledger8-contract';
import { type BreadcrumbSink, emitEncoding, emitHeadResolution } from './breadcrumbs';

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
      throw new EraInvariantViolationError(seam, circuitId, 'v9', 'v8');
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
      throw new EraInvariantViolationError(seam, circuitId, 'v8', 'v9');
    default: {
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}

/**
 * Refuses a finalized-transaction record that carries no readable era tag,
 * accepting either arm.
 *
 * The retained arm's counterpart to {@link requireV9Record}, for the paths
 * where BOTH tags are legitimate answers and there is therefore no era to
 * refuse. A contract found on chain was deployed in whichever era was current
 * then, so its deploy record is genuinely either arm. What is still refusable
 * is a tag that names no era at all: `version` selects the runtime of the live
 * `tx` handle beside it, so an unreadable tag hands a caller a handle it cannot
 * attribute.
 *
 * @param record The record the read surface returned.
 * @param seam The read-surface method that returned it.
 * @returns The record, tagged with a recognised era.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireTaggedRecord(record: VersionedFinalizedTxData, seam: EraSeam): VersionedFinalizedTxData {
  if (typeof record !== 'object' || record === null) {
    throw new UntaggedPayloadError(seam, record);
  }
  switch (record.version) {
    case 'v8':
    case 'v9':
      return record;
    default: {
      const unhandled: never = record;
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

// Declared on the PUBLIC surface, in `../era`, because results now publish it:
// `src/internal` is hidden from consumers, and a published member whose type a
// consumer cannot name is one they cannot write a signature against. Re-exported
// here so this module's own callers keep importing it from where they always did.
export type { PipelineEra } from '../era';

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
 * The one read {@link resolveOperationEra} and {@link resolveContractStateEra} make on the
 * public data provider.
 *
 * Declared as a `Pick` of the real provider rather than as the whole interface: a full
 * `PublicDataProvider` satisfies it, so nothing at a call site changes, while a test — and a
 * reader — sees exactly which member is consulted.
 */
export type HeadVersionSource = Pick<PublicDataProvider, 'queryLatestProtocolVersion'>;

// The `constructor.name` values that appear on the two eras' generated code. `ASYNC_FUNCTION`
// REFUSES; `PLAIN_FUNCTION` admits a candidate and decides nothing. A build step targeting below
// ES2017 rewrites an `AsyncFunction` into a plain one, so reading `PLAIN_FUNCTION` as proof of the
// retained era let a transpiled current-era contract into the retained pipeline. The rewrite runs
// in one direction only -- a build can erase `async`, never fabricate it -- which is what makes the
// async reading sound as a refusal and the plain reading unsound as a route.
const PLAIN_FUNCTION = 'Function';
const ASYNC_FUNCTION = 'AsyncFunction';

/**
 * The `compact-runtime` versions this framework can place on the era timeline, keyed by
 * `major.minor` because a patch release never moves a toolchain across the fork.
 *
 * Frozen, and the ONE place a toolchain version is turned into an era. Adding an era adds a row
 * here; the gate below refuses to compile if one is added without a row.
 *
 * The gate has to be a CONSTRAINT, not a bare conditional type: `type X = ... ? true : never` is a
 * legal declaration that nothing reads, so it computes the answer and discards it. Passing the
 * conditional through `Assert` makes the failing case violate a constraint, which is a build error.
 */
const RUNTIME_VERSION_TO_ERA = Object.freeze({
  '0.16': RETAINED_PIPELINE_ERA,
  '0.19': CURRENT_PIPELINE_ERA
} as const);

// Compile-time gate: every pipeline era must be reachable from some declared runtime version.
// Without it a third era could be added to `PipelineEra` with no toolchain mapped to it, and every
// artifact built by that toolchain would be refused at run time instead of failing here.
type MappedEra = (typeof RUNTIME_VERSION_TO_ERA)[keyof typeof RUNTIME_VERSION_TO_ERA];
type Assert<T extends true> = T;
// The tuple wrapping keeps this a whole-union check rather than a distributive one, so a single
// mapped era could never satisfy it on behalf of the rest.
type _EveryEraHasARuntimeVersion = Assert<[PipelineEra] extends [MappedEra] ? true : false>;

const RUNTIME_VERSION = /^(\d+\.\d+)\.\d+/;

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

/** What the artifact's own shape can establish, which is never an era on its own. */
type ArtifactShape = 'current-era-container' | 'retained-era-candidate';

/**
 * The one read {@link resolveArtifactEra} makes on the ZK config provider.
 *
 * Declared as a `Pick` of the real provider for the same reason {@link HeadVersionSource} is: a full
 * `ZKConfigProvider` satisfies it, so nothing at a call site changes, while a test -- and a reader
 * -- sees exactly which member is consulted.
 */
export type ArtifactRuntimeVersionSource = Pick<ZKConfigProvider<string>, 'getArtifactRuntimeVersion'>;

/**
 * Places a declared `compact-runtime` version on the era timeline.
 *
 * @param runtimeVersion The version string the compiler recorded, verbatim.
 * @returns The pipeline era that toolchain builds for, or `undefined` if this framework knows no
 * such toolchain -- which the caller reports rather than resolving to a default.
 */
const eraOfRuntimeVersion = (runtimeVersion: string): PipelineEra | undefined => {
  const majorMinor = RUNTIME_VERSION.exec(runtimeVersion)?.[1];

  return majorMinor === undefined ? undefined : RUNTIME_VERSION_TO_ERA[majorMinor as keyof typeof RUNTIME_VERSION_TO_ERA];
};

/**
 * Reads what the caller's contract object can prove about itself, WITHOUT deciding an era for a
 * retained candidate.
 *
 * A STRUCTURAL check, and it must not be "improved" to test the vendor's registered
 * `CompiledContract` brand: that brand sits on a prototype the container's own combinators drop,
 * so a brand test reports `false` for every real current-era caller.
 * `src/test/era-dispatch.test.ts` pins that.
 *
 * @param compiledContract The value a caller passed as its contract. `unknown`, because a
 * JavaScript caller can pass anything and the point of this function is to say what it passed.
 * @returns Which of the two recognised shapes it has.
 * @throws EraArtifactMismatchError with reason `'unwrapped-current-era-contract'` for a raw
 * current-era contract instance whose `async` survived the caller's build, and
 * `'unrecognised-contract-shape'` for an object matching neither era.
 * @see {@link EraDispatch} for the shape table each branch below implements, the brand-loss
 * measurement, and why `initialState` is the one check that is not an own-property check.
 */
const artifactShapeOf = (compiledContract: unknown): ArtifactShape => {
  if (typeof compiledContract !== 'object' || compiledContract === null) {
    throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }

  if (!hasOwnProperty(compiledContract, 'impureCircuits')) {
    // The container carries a `tag` and none of the circuit collections. The `tag`'s VALUE is
    // chosen by the caller (`CompiledContract.make(tag, ctor)`) and says nothing about an era; what
    // places this object is that only the current toolchain's container has this shape, and that
    // the property is an OWN one, so it survives both the spread its own combinators perform and
    // any build step -- which is why this arm needs no artifact read. Requiring the `tag` as well
    // as the absence of `impureCircuits` is what stops an arbitrary object -- `{}` included -- from
    // being routed into the current-era pipeline by default.
    if (hasOwnProperty(compiledContract, 'tag') && typeof compiledContract.tag === 'string') {
      return 'current-era-container';
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
      return 'retained-era-candidate';
    case ASYNC_FUNCTION:
      throw new EraArtifactMismatchError('unwrapped-current-era-contract');
    default:
      // A codegen shape neither era produces. Refused rather than routed anywhere by default.
      throw new EraArtifactMismatchError('unrecognised-contract-shape');
  }
};

/**
 * Decides which pipeline a caller's contract belongs to, from what the artifact DECLARES.
 *
 * Two answers, one per era, and neither rests on a property of generated JavaScript that a
 * consumer's build can rewrite. The current era arrives wrapped in a container whose own `tag`
 * survives every build step, so recognising that container is enough. The retained era has no such
 * container, so it is placed by the `runtime-version` its artifact set declares. The shape of the
 * generated code is consulted only to refuse.
 *
 * The artifact set is read ONLY for a retained candidate, so a current-era caller pays no round trip
 * for this and needs no file it does not already ship.
 *
 * @param compiledContract The value a caller passed as its contract.
 * @param source The ZK config provider serving that contract's artifacts.
 * @returns The pipeline that contract belongs to.
 * @throws EraArtifactMismatchError with reason `'unrecognised-contract-shape'` or
 * `'unwrapped-current-era-contract'` before the provider is consulted at all;
 * `'artifact-era-undeclared'` when the provider cannot report a runtime version, carrying its
 * failure on `cause`; and `'unknown-artifact-runtime-version'` for a toolchain this framework
 * cannot place.
 * @see {@link EraDispatch} for the table this implements and why the era may not be inferred.
 */
export const resolveArtifactEra = async (
  compiledContract: unknown,
  source: ArtifactRuntimeVersionSource
): Promise<PipelineEra> => {
  if (artifactShapeOf(compiledContract) === 'current-era-container') {
    return CURRENT_PIPELINE_ERA;
  }

  let runtimeVersion: string;
  try {
    runtimeVersion = await source.getArtifactRuntimeVersion();
  } catch (error) {
    // Only the two failures that are STATEMENTS about the era become era refusals. A transport
    // fault, a permission fault or a bug in a caller's provider says nothing about which ledger
    // executes this call, and relabelling it sends the caller to serve a file that is already
    // there. `readHeadEra` states the same rule for the head read.
    if (error instanceof ZkArtifactContractInfoError) {
      throw new EraArtifactMismatchError('artifact-era-undeclared', { cause: error });
    }
    if (error instanceof ArtifactRuntimeVersionUnavailableError) {
      throw new EraArtifactMismatchError('provider-cannot-declare-era', { cause: error });
    }
    throw error;
  }

  const era = eraOfRuntimeVersion(runtimeVersion);
  if (era === undefined) {
    throw new EraArtifactMismatchError('unknown-artifact-runtime-version', {
      detail: `The artifacts declare compact-runtime ${runtimeVersion}.`
    });
  }
  // A retained SHAPE whose artifacts declare the current toolchain is the mistake this dispatch
  // exists to catch: a current-era contract passed raw, with its `async` erased by the caller's
  // build. It reads as retained and is not.
  if (era === CURRENT_PIPELINE_ERA) {
    throw new EraArtifactMismatchError('unwrapped-current-era-contract');
  }

  return era;
};

/**
 * {@link resolveArtifactEra}'s answer, in the narrowing form each era-dispatching entry point needs.
 *
 * Not a second decision: the era is established in exactly one place, and this only gives that
 * established value a type predicate so an entry point's body can drop the retained-era arm from its
 * parameter union without a cast.
 *
 * Name the type parameter explicitly at each call site rather than letting it infer, so the
 * narrowing removes exactly the retained-era arm of that entry point's parameter union.
 *
 * @see {@link EraDispatch} for how `era` was established.
 *
 * @param _options The options object an entry point received. Read by the type system only -- the
 *                 decision was made from the artifact's declaration, not from this object.
 * @param era The era {@link resolveArtifactEra} resolved for that object's contract.
 * @returns Whether this is a retained-era request.
 */
export const isLedger8Request = <L extends { readonly compiledContract: Ledger8Contract }>(
  _options: { readonly compiledContract: unknown } | L,
  era: PipelineEra
): _options is L => era === RETAINED_PIPELINE_ERA;

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
 * @param logger The optional logger the head-resolution breadcrumb is written to.
 * @returns The head era, the integer it was resolved from, and the era facade bound to it.
 * @throws UnknownProtocolVersionError tagged with the `construct` path when the head integer
 * cannot be placed on the era timeline. A rejection from the provider propagates unchanged.
 */
export const resolveOperationEra = async (
  pdp: HeadVersionSource,
  logger?: BreadcrumbSink
): Promise<ResolvedOperationEra> => {
  const reading = await readHeadEra(pdp);
  // Reported from the READING, before the era facade is acquired: acquiring
  // the pre-fork era is a lazy runtime load, and a breadcrumb written after it
  // would be missing for exactly the operation whose era could not be loaded.
  emitHeadResolution(logger, reading, 'operation-start');

  return acquireHeadEra(reading);
};

/**
 * How one `(artifact era, head era)` pair may run, before the operation kind is taken into
 * account.
 *
 * A closed set rather than a boolean: the pair that admits calls and refuses deploys is a cell in
 * its own right, and collapsing it into "allowed" would lose the one asymmetry the fork window
 * has.
 */
export type EraPairing =
  /** Both kinds run. */
  | 'run'
  /** Calls run -- as keep-state, when the head has moved past the artifact -- and deploys do not. */
  | 'call-only'
  /** Neither kind runs: the artifact is from an era the network head has not reached. */
  | 'artifact-newer-than-head';

/** One artifact era's ruling against every era the network head can be on. */
export type EraRulings = Readonly<Record<LedgerVersion, EraPairing>>;

/**
 * The pairing table {@link assertEraCompatible} rules from: one row per {@link PipelineEra}, one
 * column per `LedgerVersion`.
 *
 * The two era vocabularies stay separate types because they answer different questions -- which
 * era built the caller's artifact, and which era the network head is on. What this type adds is
 * that every pair of them has to be ruled: a member added to either set leaves the table short of
 * a row or a column, and that is a build failure.
 *
 * It does NOT bind the two sets to each other. A further artifact era can be added without a
 * further head era, and vice versa; what cannot happen is either one arriving unruled.
 *
 * @see {@link EraDispatch} for the table in full and why the deploy cell differs.
 */
export type EraPairingTable = Readonly<Record<PipelineEra, EraRulings>>;

/**
 * Re-homes a table onto a null prototype and freezes it, the construction
 * `packages/protocol/docs/shared-table-discipline.md` prescribes for a table indexed by a value.
 *
 * The lone cast is the point of the helper: `Object.create(null)` is `any`, and asserting it once
 * here keeps the assertion out of the table literals, where it would launder a missing row past
 * their declared types.
 */
const withNullPrototype = <T extends object>(source: T): Readonly<T> =>
  Object.freeze(Object.assign(Object.create(null) as T, source));

// The two constructors below exist for their PARAMETER types. A literal handed to one is checked
// against a total `Record`, so a missing cell, an excess cell and a verdict outside the set are all
// build failures -- at the literal, where the mistake is. Annotating `ERA_PAIRING` itself cannot do
// that: by then `withNullPrototype` has already asserted the rows into existence, and the
// annotation would accept an empty table. Do not "simplify" these away.
const rulings = (byHead: EraRulings): EraRulings => withNullPrototype(byHead);
const pairingTable = (byPipeline: EraPairingTable): EraPairingTable => withNullPrototype(byPipeline);

/**
 * Every `(artifact era, head era)` pair, ruled.
 *
 * Exported so the construction itself can be asserted -- frozen, null-prototyped, on both levels.
 * Nothing outside this module reads it to dispatch.
 */
export const ERA_PAIRING: EraPairingTable = pairingTable({
  ledger8: rulings({ v8: 'run', v9: 'call-only' }),
  ledger9: rulings({ v8: 'artifact-newer-than-head', v9: 'run' })
});

/**
 * Refuses an operation whose artifact era and network head era cannot be run together.
 *
 * Rules every cell of {@link ERA_PAIRING} rather than letting one fall through. A retained-era
 * DEPLOY on a post-fork head is the one cell where calls and deploys differ, and the `'call-only'`
 * verdict is where that difference lives.
 *
 * Returns nothing. Which pipeline runs is the `(pipeline, head)` pair the caller already holds;
 * this decides only whether that pair may run, so it does not restate the pair as a third value
 * that could disagree with it.
 *
 * @param pipeline The pipeline the artifact belongs to, from {@link resolveArtifactEra}.
 * @param head The era the network head is on, from {@link resolveOperationEra}.
 * @param kind Whether this operation deploys a contract or calls one already deployed. Anything
 * that is not a call is treated as a deploy, which is the refusing side.
 * @throws EraArtifactMismatchError with reason `'current-era-artifact-on-pre-fork-head'` for a
 * current-era artifact on a pre-fork head.
 * @throws Ledger8DeployOnV9Error for a retained-era deploy on a post-fork head.
 * @throws UnknownLedgerVersionError carrying whichever argument has no cell here, if an era is
 * added without extending the table -- and also from the closing arm, carrying a verdict rather
 * than an era, if a verdict is ever added without one. The class does not distinguish the three;
 * read `requestedVersion` for the value that was refused.
 */
export const assertEraCompatible = (
  pipeline: PipelineEra,
  head: LedgerVersion,
  kind: StaleHeadOperationKind
): void => {
  // Defence in depth, not a live boundary: both call sites pass literals today
  // (`internal/ledger8-entry.ts`) and this module is not reachable from outside the package. The
  // guards are here so that a future call site threading a value through cannot quietly widen what
  // the table admits.
  //
  // The `typeof` checks are load-bearing and are NOT redundant with the parameter types. A member
  // access coerces its key -- `ToPropertyKey` runs `toString` -- so an object, a `String` wrapper
  // or anything with `Symbol.toPrimitive` would select a real row and be RULED ON, where the
  // `switch` this replaced compared with `===` and refused it.
  if (typeof pipeline !== 'string') {
    throw new UnknownLedgerVersionError(String(pipeline));
  }
  const pipelineRulings = ERA_PAIRING[pipeline];
  if (pipelineRulings === undefined) {
    throw new UnknownLedgerVersionError(pipeline);
  }

  if (typeof head !== 'string') {
    throw new UnknownLedgerVersionError(String(head));
  }
  const verdict = pipelineRulings[head];
  if (verdict === undefined) {
    throw new UnknownLedgerVersionError(head);
  }

  switch (verdict) {
    case 'run':
      return;
    case 'call-only':
      // Refuses on anything that is not a call, rather than refusing only on `'deploy'`. The two
      // read the same for a typed caller and differ for every other value, and this is the one
      // asymmetric cell in the fork window -- so the value nobody anticipated must land on the
      // refusing side.
      if (kind !== 'call') {
        throw new Ledger8DeployOnV9Error();
      }
      return;
    case 'artifact-newer-than-head':
      throw new EraArtifactMismatchError('current-era-artifact-on-pre-fork-head');
    default: {
      const unhandled: never = verdict;
      throw new UnknownLedgerVersionError(String(unhandled));
    }
  }
};

/**
 * Resolves WHICH era's decoder may be handed a fetched contract state, refusing only the
 * combination that cannot describe one chain.
 *
 * THE RULE THIS ENFORCES: the envelope decides, the block bounds. The two signals are not
 * symmetric and must not be compared for equality.
 *
 * The **envelope** comes off the bytes. It is what the deserializer reads, so a wrong envelope
 * yields a failure and never a wrong answer — which is what makes it safe to route on. It decides
 * which era's decoder may be handed these bytes.
 *
 * The reported **`protocolVersion`** dates the READ, not the bytes: the read surface serves the
 * latest contract action at or before the requested block, and the ledger does not rewrite a
 * contract's stored state at the fork. So a contract deployed before the fork and dormant across it
 * is served with its retained-era envelope under a post-fork head, indefinitely. That is the
 * ORDINARY case, and it is precisely what keep-state operates on. Only the reverse — an envelope
 * NEWER than the block dating it — is impossible and therefore reported.
 *
 * DO NOT REINTRODUCE AN EQUALITY CHECK BETWEEN `head` AND THE ENVELOPE. It reads as symmetry and
 * costs the whole keep-state path: every post-fork call against a pre-fork contract is refused, and
 * the error blames the read surface for serving exactly what it is supposed to serve.
 *
 * `RawContractState.version` cannot answer this either: it is derived from the record's
 * `protocolVersion` alone and is explicitly not a verified statement about the envelope the bytes
 * carry (see its own documentation in `packages/types/src/raw-contract-state.ts`).
 *
 * Do not declare the tag-to-era mapping here — it lives once, as `contractStateEnvelopeVersion` in
 * `@midnight-ntwrk/midnight-js-utils`.
 *
 * @see {@link EraDispatch} for what each step buys and what breaks if it moves.
 *
 * The envelope's era is breadcrumbed as an encoding decision, and the fresh re-read below as a head
 * resolution carrying its own provenance, so a log can tell it apart from the reading the operation
 * started on.
 *
 * @param head The era the operation resolved from the network head.
 * @param state The raw contract state the operation fetched, envelope included.
 * @param pdp The read surface, for the fresh head read the impossible case needs.
 * @param logger The optional logger the encoding and re-read breadcrumbs are written to.
 * @returns The era whose decoder owns these bytes: `'v8'` for a retained envelope, `'v9'` for a
 * current-era one.
 * @throws TagParseError if `state.raw` carries no supported contract-state envelope.
 * @throws Error, carrying the transport failure on `cause`, if the fresh head read rejects — so the
 * disagreement that was under investigation is not lost behind a bare transport error.
 * @throws HeadStateEraMismatchError if a fresh head read agrees with the state's era.
 * @throws IndexerInconsistencyError if a fresh head read still disagrees with it.
 */
export const resolveContractStateEra = async (
  head: LedgerVersion,
  state: RawContractState,
  pdp: HeadVersionSource,
  logger?: BreadcrumbSink
): Promise<LedgerVersion> => {
  // NOT breadcrumbed when this THROWS. `contractStateEnvelopeVersion` refuses
  // an envelope it cannot parse, and the encoding breadcrumb's only field is
  // the era the tag declared -- so on that path there is no era to report and
  // no placeholder worth inventing for one. The `TagParseError` it raises
  // already names what the bytes carried instead, which is the more precise
  // signal, and the operation-start head reading is already in the log.
  const stateEra = contractStateEnvelopeVersion(state.raw);
  // Reported for the ACCEPTED case too, not only for a refusal: which era
  // decoded a state is the fact an operator needs when the state decodes but
  // the call behaves oddly, and only the accepted path reaches a decoder.
  emitEncoding(logger, stateEra);
  // The retained ledger wrote it, which is the only thing this pipeline can
  // read -- under EITHER head. Pre-fork this is a native call; post-fork it is
  // keep-state. Both are ordinary, and neither involves the head.
  if (stateEra === 'v8') {
    return stateEra;
  }

  // From here the state carries a CURRENT-era envelope.
  //
  // Under a post-fork head that is ORDINARY, and it is what makes keep-state
  // more than a single call: the first post-fork call migrates the contract's
  // envelope from retained to current-era, and the ledger carries the retained
  // VERIFIER KEYS across unchanged. So the bytes are the current decoder's to
  // read while the artifacts that fit the contract are still the retained ones.
  //
  // The envelope answers ONE question -- which decoder may read these bytes --
  // and it is not the question of whether the caller's artifacts fit this
  // contract. Refusing here answered the second question with the first, and
  // cost every call after a contract's first post-fork one. The key check does
  // answer it, against the keys this state actually declares; see
  // `assertSnapshotVerifierKey`.
  if (head === 'v9') {
    return stateEra;
  }

  // Under a PRE-fork head a current-era envelope is impossible: the envelope is
  // newer than the block dating it, and no runtime can have written it yet.
  // Either the operation's head reading went stale under it, or the two answers
  // cannot both describe one chain -- a fresh read is what separates the two.
  let freshReading: HeadEraReading;
  try {
    // `readHeadEra` rather than `networkHeadVersion`: the same one round trip
    // and the same `'construct'` era mapping, but it also yields the raw
    // integer, which is what the breadcrumb needs and what distinguishes a
    // same-era node bump from a real era move.
    freshReading = await readHeadEra(pdp);
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

  emitHeadResolution(logger, freshReading, 'disagreement-re-read');

  if (freshReading.head !== stateEra) {
    throw new IndexerInconsistencyError(freshReading.head, stateEra);
  }
  throw new HeadStateEraMismatchError(head, stateEra);
};
