/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

// Re-export WitnessContext from compact-runtime to ensure type compatibility
export type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Import WitnessContext to define dependent types
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Define witness function and witnesses types based on compact-runtime's WitnessContext
export type WitnessFunction<TLedger = unknown, TPrivateState = unknown> = (
  context: WitnessContext<TLedger, TPrivateState>
) => [TPrivateState, unknown[]];

export type Witnesses<TLedger = unknown, TPrivateState = unknown> = Record<
  string,
  WitnessFunction<TLedger, TPrivateState>
>;

export interface WitnessCallEvent<TPrivateState = unknown> {
  witnessName: string;
  context: WitnessContext<unknown, TPrivateState>;
  result: [TPrivateState, unknown[]];
}
