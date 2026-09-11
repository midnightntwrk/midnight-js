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
 * Which pipeline produced a result, published so a caller can tell without
 * inspecting the objects inside it.
 *
 * The vocabulary was already resolved internally, by `resolveArtifactEra`, from the
 * compiled artifact a caller supplied. This module is where it becomes
 * nameable: `src/internal` is hidden from consumers, and a published member
 * whose type a consumer cannot name is a member they cannot write a signature
 * against.
 */

/**
 * Which execution pipeline an operation takes, and so which toolchain produced
 * the objects in its result.
 *
 * Each member names the LEDGER ERA the pipeline executes against — `'ledger8'`
 * runs against ledger 8, `'ledger9'` against ledger 9 — never a toolchain
 * version, and never which era is the newest. A further ledger era ADDS a
 * member instead of renaming one.
 *
 * Read off the compiled ARTIFACT, never off a transaction record. The two are
 * different facts and they disagree after the fork: a retained-era call is
 * recorded as a keep-state transaction with `version: 'v9'` while every object
 * in its result comes from `onchain-runtime-v3`. Branching on the record would
 * send a caller to the wrong module.
 *
 * Not a statement about the network either — the pairing with the head era is
 * what decides whether an operation can run at all.
 */
export type PipelineEra = 'ledger8' | 'ledger9';

/**
 * The tag a CURRENT-era result carries.
 *
 * Declared as the single member rather than as {@link PipelineEra} so that
 * `result.era` DISCRIMINATES: a union of the two eras' results narrows to one
 * arm on `if (result.era === 'ledger9')`, which it could not do if both arms
 * declared the whole union.
 */
export type CurrentPipelineEra = Extract<PipelineEra, 'ledger9'>;

/**
 * The tag a RETAINED-era result carries. See {@link CurrentPipelineEra} for why
 * this is the literal and not the union.
 */
export type RetainedPipelineEra = Extract<PipelineEra, 'ledger8'>;

/** {@link CurrentPipelineEra} as a value, for the construction sites. */
export const CURRENT_PIPELINE_ERA: CurrentPipelineEra = 'ledger9';

/** {@link RetainedPipelineEra} as a value, for the construction sites. */
export const RETAINED_PIPELINE_ERA: RetainedPipelineEra = 'ledger8';
