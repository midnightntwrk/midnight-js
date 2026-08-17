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

// `typeof import(...)` is required here rather than a top-level `import type`
// statement: it keeps the module reference purely local to this type alias,
// with nothing to point at 'v8' but this line.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type ProtocolV8 = typeof import('./v8.js');

let v8ModulePromise: Promise<ProtocolV8> | undefined;

/** The only sanctioned runtime path to the v8 era (spec §4.1(3)).
 *  Self-reference specifier: resolves within this installed protocol copy;
 *  external to the rollup bundle, so the WASM loads only on first call. */
export const loadV8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('@midnight-ntwrk/midnight-js-protocol/v8'));
