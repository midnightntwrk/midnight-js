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
 * compact-js's RETAINED-era (ledger 8) entry, re-exported.
 *
 * Published for the same reason the current era's entry is: only
 * `packages/protocol/src/` may import compact-js directly, so a downstream
 * package that has to name a retained-era value reaches it through here.
 *
 * `executeCircuit` does NOT take one of these containers — it takes a
 * {@link RetainedContract}, the constructed artifact the previous toolchain
 * emits, and `containerFor` adapts it at that seam. Making `CompiledContract`
 * the retained era's public surface was attempted and reverted; see ADR 0015.
 */

export * from '@midnight-ntwrk/compact-js/v8/effect';
