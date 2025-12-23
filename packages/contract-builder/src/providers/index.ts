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

/**
 * Providers module - default provider presets for Node.js and Browser
 */

// Main factory
export {
  createDefaultProviders,
  createDevnetProviders,
  createLocalProviders,
  createTestnetProviders} from './factory.js';

// Types
export type {
  ContractProviders,
  NetworkConfig,
  NetworkPreset,
  ProviderEnvironment,
  ProviderPresetConfig,
  WalletConfig} from './types.js';
export { NETWORK_PRESETS } from './types.js';

// Environment detection
export {
  detectEnvironment,
  isBrowser,
  isNodeJS,
  resolveEnvironment} from './environment.js';

// Individual presets (advanced use)
export { createBrowserProviders } from './browser-preset.js';
export { createNodeJSProviders } from './nodejs-preset.js';
