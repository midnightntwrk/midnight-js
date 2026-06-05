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

import { DeserializationError, isDeserializationError } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Context describing the contract entrypoint currently executing.
 * Used by {@link withRuntimeContext} to enrich `DeserializationError.caller`
 * with the operation and circuit at the contracts-package boundary.
 */
export interface RuntimeCallContext {
  readonly operation: 'call' | 'deploy' | 'find';
  readonly circuitId?: string;
  readonly contractAddress?: string;
}

const CALLER_PACKAGE = '@midnight-ntwrk/midnight-js-contracts';

const buildCaller = (context: RuntimeCallContext): string =>
  `${CALLER_PACKAGE}:${context.operation}(${context.circuitId ?? '-'})`;

/**
 * Async higher-order function wrapping contract entrypoints (`call`/`deploy`/`find`).
 *
 * Behavior:
 * - On resolve: returns the resolved value unchanged.
 * - On rejection with a non-{@link DeserializationError}: re-throws the original
 *   error unchanged (same reference, preserving stack and identity — D3).
 * - On rejection with a {@link DeserializationError}: throws a *new*
 *   `DeserializationError` whose `caller` is overwritten with the contracts-package
 *   identifier (`{operation}({circuitId|-})`), preserving every other field of
 *   the inner context — including `callee` (D15), `dataType`, `source`,
 *   `classification`, `direction`, `mitigation`, `extracted`, and `pinnedVersions`.
 *   The outer `cause` is set to the inner error's own `cause` (flat chain
 *   per spec §7.5 — unconditional). The cause is passed through as-is
 *   regardless of its shape; we NEVER re-wrap the inner `DeserializationError`
 *   itself as cause (avoids 3-level chain).
 */
export const withRuntimeContext = async <T>(
  context: RuntimeCallContext,
  fn: () => Promise<T>
): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    if (!isDeserializationError(e)) {
      throw e;
    }
    const enrichedContext = {
      ...e.context,
      caller: buildCaller(context)
    };
    throw new DeserializationError(enrichedContext, e.cause);
  }
};
