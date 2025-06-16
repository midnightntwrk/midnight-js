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
export const getEnvVarEnvironment = () => {
  if (
    process.env.MN_TEST_ENVIRONMENT === undefined ||
    process.env.MN_TEST_ENVIRONMENT === 'undefined'
  ) {
    return 'undeployed';
  }
  return process.env.MN_TEST_ENVIRONMENT;
};
export const getEnvVarNetworkId = () => {
  return process.env.MN_TEST_NETWORK_ID;
};
export const getEnvVarWalletSeeds = () => {
  const envSeeds = process.env.MN_TEST_WALLET_SEED || process.env.TEST_WALLET_SEED;
  return envSeeds ? envSeeds.split(',') : undefined;
};
export const MN_TEST_INDEXER = process.env.MN_TEST_INDEXER;
export const MN_TEST_INDEXER_WS = process.env.MN_TEST_INDEXER_WS;
export const MN_TEST_NODE = process.env.MN_TEST_NODE;
export const MN_TEST_FAUCET = process.env.MN_TEST_FAUCET;
