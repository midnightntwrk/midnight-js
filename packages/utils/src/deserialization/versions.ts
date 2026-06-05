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
 * The npm package versions pinned by `@midnight-ntwrk/midnight-js-protocol`.
 * These appear in mitigation hints and in `DeserializationContext.pinnedVersions`.
 *
 * Update this file when bumping any of the underlying packages
 * (`@midnight-ntwrk/ledger-vN`, `@midnight-ntwrk/onchain-runtime-vN`).
 */
export const PINNED_VERSIONS = {
  ledger: 'v8',
  /**
   * `@midnight-ntwrk/compact-runtime` has no major-version suffix in its npm
   * name (unlike `ledger-vN` / `onchain-runtime-vN`). Rendered as
   * "unversioned" in error messages to make the asymmetry explicit.
   */
  compactRuntime: 'unversioned',
  onchainRuntime: 'v3'
} as const;
