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
 * Identifies the Midnight network a transaction is built for, e.g. `'preview'` or `'undeployed'`.
 */
export type NetworkId = string;

/**
 * Settings the framework applies to every transaction it builds.
 */
export interface MidnightConfig {
  /**
   * The network transactions are built for. Also selects the Bech32m prefix used to decode wallet keys.
   */
  readonly networkId: NetworkId;
  /**
   * How long a built transaction stays valid, in whole seconds. Must be a positive integer.
   */
  readonly ttlSeconds: number;
}
