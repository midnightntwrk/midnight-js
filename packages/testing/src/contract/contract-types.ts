// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
}
