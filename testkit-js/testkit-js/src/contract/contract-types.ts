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

import type { ZkConfigIntegrityOptions } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Configuration interface for Midnight contracts.
 */
export interface ContractConfiguration {
  /**
   * Name of the store used for persisting private state data.
   * This is used as a base name - a signing key store will also be created with "-signing-keys" appended.
   */
  readonly privateStateStoreName: string;

  /**
   * File system path to the zero-knowledge proof configuration files.
   * This should point to the directory containing the circuit verification keys and other ZK artifacts.
   */
  readonly zkConfigPath: string;

  /**
   * Integrity-verification options for the ZK artifacts, passed straight to the
   * config provider. Omitted means the provider's own default, `require`.
   *
   * Needed because retained-era artifacts cannot satisfy `require`: `compactc`
   * 0.31.1 emits `compiler/contract-info.json` and no
   * `compiler/contract-manifest.json`, and the manifest is what verification
   * reads. A pre-fork contract therefore has nothing to verify against, however
   * intact its artifacts are.
   */
  readonly zkConfigIntegrity?: ZkConfigIntegrityOptions;
}
