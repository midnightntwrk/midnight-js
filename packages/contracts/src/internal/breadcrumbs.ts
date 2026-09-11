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
 * Three decisions get a breadcrumb, at DEBUG level, as STRUCTURED fields rather
 * than interpolated prose. Era decisions that are REFUSALS are not breadcrumbed
 * a second time: each already throws a registered, remediation-carrying error.
 *
 * EVERY head read in this package is breadcrumbed, and there are four. A new
 * head read has to add a {@link HeadReadingProvenance} member.
 *
 * PRIVACY: a breadcrumb may carry version integers, era names, decision names
 * and a contract address. It must NEVER carry key bytes, decoded contract
 * state, private state or a raw transaction payload — which is why every field
 * below is a bounded string literal or a number, and why the emitters take
 * individual facts rather than an options bag.
 * `src/test/breadcrumbs.test.ts` asserts it over the serialized breadcrumb.
 *
 * @see {@link Breadcrumbs} for the four readings, what each breadcrumb carries,
 *      and what is deliberately not recorded.
 */

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';

import type { HeadEraReading, PipelineEra } from './era';

/**
 * Where a head reading came from.
 *
 * The distinction matters in the fork window: two readings of the network are
 * different observations, and a log that could not tell them apart would read
 * as one operation contradicting itself.
 *
 * @see {@link Breadcrumbs} for the four readings this names.
 */
export type HeadReadingProvenance =
  /** The single reading taken at the operation's asynchronous start. */
  | 'operation-start'
  /** The fresh re-read taken to adjudicate a head/state era disagreement. */
  | 'disagreement-re-read'
  /**
   * The fresh re-read taken after the network REJECTED a submitted
   * transaction, to decide whether the head moved across the fork underneath
   * the operation. The only reading taken after bytes were already on the wire.
   */
  | 'post-rejection-re-read';

/** The head integer was read, and placed on the era timeline. */
export interface HeadResolutionBreadcrumb {
  readonly decision: 'head-resolution';
  /** The era the head integer resolved to. */
  readonly version: LedgerVersion;
  /**
   * The raw head integer, carried BESIDE the era name rather than instead of
   * it: the era collapses node minor versions and only the integer says which.
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
 * The route is the `(path, version)` pair itself and is not restated as a third
 * field. Do not add one — a derived name could disagree with the pair.
 *
 * @see {@link Breadcrumbs} for what each field carries and why.
 */
export interface PipelineSelectionBreadcrumb {
  readonly decision: 'pipeline-selection';
  /** The era the network head is on. */
  readonly version: LedgerVersion;
  readonly protocolVersion: number;
  /** One value today, carried anyway: a second selection input is exactly the
   * change that would need to show up in a log. */
  readonly source: 'compiled-contract-shape';
  readonly readingProvenance: HeadReadingProvenance;
  /** The pipeline the artifact belongs to. */
  readonly path: PipelineEra;
  /**
   * The contract being operated on, present exactly when the operation names
   * one. ABSENT rather than empty for a deploy — an empty string would read as
   * a deployment at the zero address.
   */
  readonly contractAddress?: string;
}

/**
 * The fetched contract state was dated from its envelope tag.
 *
 * The byte-level answer, and NOT the same claim as `RawContractState.version`.
 *
 * Carries no head integer and no reading provenance: dating an envelope is not
 * a head reading.
 *
 * @see {@link Breadcrumbs} for the difference from `RawContractState.version`.
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
 * Its own narrow shape rather than `Pick<LoggerProvider, 'debug'>`, so the
 * payload parameter is a {@link DispatchBreadcrumb} instead of pino's
 * `unknown`-first `LogFn` — which is what lets a test read the emitted fields
 * without a cast. A real `LoggerProvider` satisfies this.
 */
export interface BreadcrumbSink {
  readonly debug?: (breadcrumb: DispatchBreadcrumb, message: string) => void;
}

/**
 * The fixed message every breadcrumb is written under.
 *
 * Nothing is interpolated into it, so the fields stay the only thing an
 * operator has to read and an aggregator can group the three decisions without
 * parsing prose.
 */
export const DISPATCH_BREADCRUMB_MESSAGE = 'contract era dispatch decision';

const emit = (sink: BreadcrumbSink | undefined, breadcrumb: DispatchBreadcrumb): void => {
  try {
    // `call` rather than a bare invocation: a `LoggerProvider` may be a pino
    // instance, whose log functions read the logger as `this`.
    sink?.debug?.call(sink, breadcrumb, DISPATCH_BREADCRUMB_MESSAGE);
  } catch {
    // SWALLOWS: a fault thrown by the CONFIGURED LOGGER, and nothing else.
    // `debug` is arbitrary third-party code sitting on the success path of every
    // retained-era operation, and observability must never break execution.
    //
    // DO NOT WIDEN. The guard wraps the emission and nothing else -- nothing
    // that computes a value, reads the network or decides an era may move
    // inside it. See {@link Breadcrumbs} for why this is not the never-swallow
    // rule's subject, and `src/test/breadcrumbs.test.ts` for both directions.
  }
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
    // Spread rather than assigned: an operation with no address must leave the field OUT, not
    // present and undefined.
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
