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
 * package that has to name a retained-era value — `CompiledContract.make` for
 * the container `executeCircuit` takes — reaches it through here.
 */

export * from '@midnight-ntwrk/compact-js/v8/effect';
