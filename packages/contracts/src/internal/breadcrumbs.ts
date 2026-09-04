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
 * What an operator can see about which ledger era an operation ran against.
 *
 * Across a hard fork the same call can take three different routes depending
 * on one integer read from the network, and when it takes the wrong one the
 * symptom appears far from the decision. These breadcrumbs put the decision
 * itself in the log, at DEBUG level, as STRUCTURED fields rather than
 * interpolated prose, so an operator can filter on them.
 *
 * ## What is breadcrumbed, and what deliberately is not
 *
 * Three decisions get a breadcrumb, and they are the three this package makes:
 * {@link HeadResolutionBreadcrumb}, {@link PipelineSelectionBreadcrumb} and
 * {@link EncodingBreadcrumb}.
 *
 * Several era decisions a reader might expect are REFUSALS rather than
 * choices, and are not breadcrumbed a second time: each already throws a
 * registered, remediation-carrying error, which is a stronger signal than a
 * debug line. The retained-era deploy arm refuses; a scoped transaction on a
 * pre-fork head refuses; a provider answering on the other era's arm refuses;
 * a fetched state whose envelope disagrees with the head refuses. The head
 * reading each of those refusals rests on IS breadcrumbed, because that
 * reading is what an operator has to see to know whether the refusal was
 * correct.
 *
 * There is no verifier-key breadcrumb. Which key version the chain holds is
 * not observable from here: both ledgers' read APIs expose only the latest
 * available version of a verifier key, so there is no key-generation decision
 * to record.
 *
 * There is no breadcrumb for a latched or cached era reading, because there is
 * no latch: an era reading is taken per operation and threaded down as a
 * value (`docs/adr/0008-never-latch-the-network-head-version.md`).
 *
 * ## Privacy
 *
 * A breadcrumb may carry version integers, era names, decision names and a
 * contract address -- all of them public identifiers. It must never carry key
 * bytes, decoded contract state, private state or a raw transaction payload.
 * That is why every field below is a bounded string literal or a number, and
 * why the emitters take the individual facts rather than an options bag they
 * could pass through wholesale. `src/test/breadcrumbs.test.ts` asserts it over
 * the serialized breadcrumb.
 */

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';

import type { HeadEraReading, PipelineEra } from './era';

/**
 * Where a head reading came from.
 *
 * The distinction matters in the fork window: an operation takes ONE reading
 * at its asynchronous start, and takes a SECOND, fresh one only when the
 * contract state it fetched turns out to be dated to a different era. The two
 * are different observations of the network, and a log that could not tell
 * them apart would read as one operation contradicting itself.
 */
export type HeadReadingProvenance =
  /** The single reading taken at the operation's asynchronous start. */
  | 'operation-start'
  /** The fresh re-read taken to adjudicate a head/state era disagreement. */
  | 'disagreement-re-read';

/** The head integer was read, and placed on the era timeline. */
export interface HeadResolutionBreadcrumb {
  readonly decision: 'head-resolution';
  /** The era the head integer resolved to. */
  readonly version: LedgerVersion;
  /**
   * The raw head integer.
   *
   * Carried BESIDE the era name rather than instead of it: the era
   * deliberately collapses node minor versions, so two operations can report
   * the same era while having read different nodes, and only the integer says
   * which.
   */
  readonly protocolVersion: number;
  readonly source: 'public-data-provider';
  readonly readingProvenance: HeadReadingProvenance;
}

/**
 * The artifact's pipeline was paired with the head era, and the era gate
 * accepted the pairing.
 *
 * Emitted AFTER the gate, never before: a breadcrumb written before the gate
 * would claim a pipeline for an operation that was then refused.
 *
 * Which ROUTE that pairing runs is the `(path, version)` pair itself and is
 * not restated as a third field -- `path: 'ledger8'` with `version: 'v9'` is
 * the keep-state route, with `version: 'v8'` the retained-native one. A
 * derived route name could disagree with the pair it was derived from, which
 * is the same reason the era gate itself returns nothing.
 */
export interface PipelineSelectionBreadcrumb {
  readonly decision: 'pipeline-selection';
  /** The era the network head is on. */
  readonly version: LedgerVersion;
  readonly protocolVersion: number;
  /**
   * A pipeline is selected in exactly one way -- from the shape of the
   * compiled contract the caller passed -- so this has one value today. It is
   * carried anyway, because a second selection input is exactly the change
   * that would need to show up in a log.
   */
  readonly source: 'compiled-contract-shape';
  readonly readingProvenance: HeadReadingProvenance;
  /** The pipeline the artifact belongs to. */
  readonly path: PipelineEra;
  /**
   * The contract being operated on, present exactly when the operation names
   * one. A deploy has no address until its composition mints one, so the
   * field is ABSENT there rather than empty -- an empty string would read as a
   * deployment at the zero address.
   */
  readonly contractAddress?: string;
}

/**
 * The fetched contract state was dated from its envelope tag.
 *
 * This is the byte-level answer, and it is not the same claim as
 * `RawContractState.version`, which is derived from the record's own
 * `protocolVersion` and is explicitly not a verified statement about the
 * envelope.
 *
 * It carries no head integer and no reading provenance: dating an envelope is
 * not a head reading. When the era it reports disagrees with the head, the
 * re-read that follows is reported as its own
 * {@link HeadResolutionBreadcrumb}.
 */
export interface EncodingBreadcrumb {
  readonly decision: 'encoding';
  /** The era the envelope tag declares. */
  readonly version: LedgerVersion;
  readonly source: 'contract-state-envelope-tag';
}

/** Every dispatch decision this package reports. */
export type DispatchBreadcrumb = HeadResolutionBreadcrumb | PipelineSelectionBreadcrumb | EncodingBreadcrumb;

/**
 * The ONE logger member a breadcrumb reaches.
 *
 * Declared as its own narrow shape rather than as `Pick<LoggerProvider,
 * 'debug'>` so the payload parameter is typed as a {@link DispatchBreadcrumb}
 * instead of pino's `unknown`-first `LogFn` -- which is what lets a test read
 * the emitted fields without a cast. A real `LoggerProvider` satisfies this,
 * so nothing at a call site changes.
 */
export interface BreadcrumbSink {
  readonly debug?: (breadcrumb: DispatchBreadcrumb, message: string) => void;
}

/**
 * The fixed message every breadcrumb is written under.
 *
 * Fixed, and with nothing interpolated into it, so the fields stay the only
 * thing an operator has to read -- and so a log aggregator can group the three
 * decisions without parsing prose.
 */
export const DISPATCH_BREADCRUMB_MESSAGE = 'contract era dispatch decision';

const emit = (sink: BreadcrumbSink | undefined, breadcrumb: DispatchBreadcrumb): void => {
  // `call` rather than a bare invocation: a `LoggerProvider` may be a pino
  // instance, whose log functions read the logger as `this`.
  sink?.debug?.call(sink, breadcrumb, DISPATCH_BREADCRUMB_MESSAGE);
};

/**
 * Reports one head reading.
 *
 * @param sink The configured logger, or `undefined` -- the logger provider is
 * optional on every provider set, so absent is the ordinary case.
 * @param reading The head reading to report, era and integer together.
 * @param readingProvenance Which reading this is.
 */
export const emitHeadResolution = (
  sink: BreadcrumbSink | undefined,
  reading: HeadEraReading,
  readingProvenance: HeadReadingProvenance
): void =>
  emit(sink, {
    decision: 'head-resolution',
    version: reading.head,
    protocolVersion: reading.headProtocolVersion,
    source: 'public-data-provider',
    readingProvenance
  });

/**
 * Reports an accepted `(pipeline, head era)` pairing.
 *
 * @param sink The configured logger, or `undefined`.
 * @param reading The head reading the pairing was gated against.
 * @param path The pipeline the artifact belongs to.
 * @param contractAddress The contract being operated on, omitted by an
 * operation that names none.
 */
export const emitPipelineSelection = (
  sink: BreadcrumbSink | undefined,
  reading: HeadEraReading,
  path: PipelineEra,
  contractAddress?: string
): void =>
  emit(sink, {
    decision: 'pipeline-selection',
    version: reading.head,
    protocolVersion: reading.headProtocolVersion,
    source: 'compiled-contract-shape',
    readingProvenance: 'operation-start',
    path,
    // Spread rather than assigned: an operation with no address must leave the
    // field OUT, not present and undefined, so a strict reader of the log
    // cannot mistake it for a deployment at an unnamed address.
    ...(contractAddress === undefined ? {} : { contractAddress })
  });

/**
 * Reports the era a fetched contract state's envelope tag declares.
 *
 * @param sink The configured logger, or `undefined`.
 * @param envelopeEra The era read from the tag in front of the state bytes.
 */
export const emitEncoding = (sink: BreadcrumbSink | undefined, envelopeEra: LedgerVersion): void =>
  emit(sink, { decision: 'encoding', version: envelopeEra, source: 'contract-state-envelope-tag' });
