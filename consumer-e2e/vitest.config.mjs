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

// `consumer-e2e` is not a workspace, so `turbo run test` never reaches it and
// `yarn typecheck:consumer-e2e` was the only thing that read these files. This
// config gives its PURE modules a suite, run by `yarn test:consumer-e2e` --
// following `.github/scripts/vitest.config.mjs`, which exists for the same
// reason.
//
// Only the pure ones. Everything here that talks to docker, a chain or a
// registry is covered by the Hard fork lane and belongs nowhere near a unit
// suite; what this catches is the selection and matrix logic that decides which
// arms that lane runs, and which used to be able to narrow a shard to nothing
// without anyone noticing.

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // PINNED to this directory. `include` resolves against `root`, and `root`
  // defaults to the working directory the runner was invoked from -- the
  // repository root, for `yarn test:consumer-e2e`. Left at that default the glob
  // walks the whole tree and collects every `.worktrees/*` checkout as well,
  // running other branches' suites under this config.
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    environment: 'node',
    include: ['*.test.mjs'],
    reporters: ['default']
  }
});
