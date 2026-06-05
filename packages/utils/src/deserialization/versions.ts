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

/**
 * The npm package families that produce the deserialization errors this
 * module wraps. The major-version suffix (e.g. `-v8`, `-v3`) is intentionally
 * omitted — error messages reference the family and rely on the structural
 * version tag carried inside the error itself (e.g. `contract-state[v6]`)
 * for the actual version context.
 *
 * This avoids hardcoded `v8`/`v3` strings that would go stale silently when
 * the underlying package is bumped.
 */
export const SOURCE_PACKAGES = {
  ledger: '@midnight-ntwrk/ledger',
  compactRuntime: '@midnight-ntwrk/compact-runtime',
  onchainRuntime: '@midnight-ntwrk/onchain-runtime'
} as const;
