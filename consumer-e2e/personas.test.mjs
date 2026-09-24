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

import { describe, expect, test } from 'vitest';

import { MATRIX_CONTRACTS, RETAINED_TWINS, resolveContractSelection } from './personas.mjs';

// WHAT THESE ARE FOR. `resolveContractSelection` decides which arms a Hard fork
// shard runs, and every way it can be wrong is silent: a shard that narrows to
// nothing runs nothing and reports green, and a shard that narrows to the wrong
// half measures a contract the job was not named after. Nothing in the fork lane
// can catch that -- a shard doing less work than intended looks exactly like a
// shard that passed.
//
// The asymmetric keys are what make it non-trivial, so they are the subject:
// `events` has no retained twin that can exist (`emit` is not a language-0.23
// form) and `private-counter` has no current-era arm worth running (a post-fork
// deploy has no pre-fork private state to carry).

describe('[Unit tests] resolveContractSelection', () => {
  /**
   * @given no requested selection
   * @when the selection is resolved
   * @then both halves are the whole of their matrix
   */
  test('covers both matrices in full when nothing is requested', () => {
    const selection = resolveContractSelection(undefined);

    expect(selection.current).toEqual(MATRIX_CONTRACTS);
    expect(selection.retained).toEqual(RETAINED_TWINS);
  });

  /**
   * @given a request naming a contract both matrices claim
   * @when the selection is resolved
   * @then both halves name it
   */
  test('keeps a contract that has both arms in both halves', () => {
    const selection = resolveContractSelection(['simple']);

    expect(selection).toEqual({ current: ['simple'], retained: ['simple'] });
  });

  /**
   * @given a request naming `events`, which has no retained twin
   * @when the selection is resolved
   * @then the retained half is empty and nothing is refused
   *
   * The pre-existing asymmetry, kept here because the change that added the
   * other one had to leave this working.
   */
  test('narrows a current-era-only contract to the current half', () => {
    const selection = resolveContractSelection(['events']);

    expect(selection).toEqual({ current: ['events'], retained: [] });
  });

  /**
   * @given a request naming `private-counter`, which has no current-era arm
   * @when the selection is resolved
   * @then the current half is empty and nothing is refused
   *
   * THE REGRESSION THIS PINS. Validation used to run against `MATRIX_CONTRACTS`
   * alone, which worked only while every retained twin was also a current-era
   * one. A retained-only key reached that check as an unknown and the shard died
   * naming it a typo.
   */
  test('narrows a retained-only contract to the retained half', () => {
    const selection = resolveContractSelection(['private-counter']);

    expect(selection).toEqual({ current: [], retained: ['private-counter'] });
  });

  /**
   * @given a request naming a contract neither matrix claims
   * @when the selection is resolved
   * @then it is refused by name, and the message lists both matrices
   *
   * Refused rather than filtered away: a typo that silently narrowed the shard
   * to nothing is the failure this whole module is shaped to prevent. The
   * message has to name the union, or a reader chasing a rejected
   * `private-counter` is told it is not a contract while the list says otherwise.
   */
  test('refuses an unknown contract and names the union in the message', () => {
    expect(() => resolveContractSelection(['dose-not-exist'])).toThrow(/dose-not-exist/);
    expect(() => resolveContractSelection(['dose-not-exist'])).toThrow(/private-counter/);
    expect(() => resolveContractSelection(['dose-not-exist'])).toThrow(/events/);
  });

  /**
   * @given a request that holds nothing but empty strings
   * @when the selection is resolved
   * @then it is refused rather than silently covering the whole matrix
   *
   * An empty `CONTRACT` env var arrives as `['']`. Filtering it away first and
   * then refusing the empty result is what separates "asked for nothing" from
   * "asked for everything", which is the difference between a shard that runs
   * one contract and one that runs eight.
   */
  test('refuses a selection that resolves to no contracts', () => {
    expect(() => resolveContractSelection([''])).toThrow(/cannot be empty/);
  });

  /**
   * @given the two matrices
   * @when their overlap is inspected
   * @then each names at least one key the other does not
   *
   * Without this the four cases above could all pass against two identical
   * lists, which is the state the selection logic was originally written for and
   * was wrong in. This is the assertion that keeps them meaningful.
   */
  test('the two matrices genuinely differ in both directions', () => {
    expect(MATRIX_CONTRACTS.filter((key) => !RETAINED_TWINS.includes(key))).not.toHaveLength(0);
    expect(RETAINED_TWINS.filter((key) => !MATRIX_CONTRACTS.includes(key))).not.toHaveLength(0);
  });
});
