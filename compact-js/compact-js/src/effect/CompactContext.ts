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

import type { Contract } from './Contract.js';

/**
 * Witness configuration.
 */
export type Witnesses<in C extends Contract.Any, W = Contract.Witnesses<C>> = {
  /**
   * An implementation of the witnesses of `C`.
   */
  readonly witnesses: W;
};

/**
 * ZK asset path configuration.
 */
export type ZKConfigAssetsPath = {
  /**
   * A path to the compiled ZK assets produced by the Compact compiler.
   */
  readonly zkConfigAssetsPath: string;
};
