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
import { sampleContractAddress } from '@midnight-ntwrk/compact-runtime';

export const MINUTE = 60_000;
export const SLOW_TEST_TIMEOUT = 6 * MINUTE;
export const VERY_SLOW_TEST_TIMEOUT = 10 * MINUTE;

export const CIRCUIT_ID_RESET = 'reset';
export const CIRCUIT_ID_INCREMENT = 'increment';
export const CIRCUIT_ID_DECREMENT = 'decrement';
export const CONTRACT_CIRCUITS = ['decrement', 'increment', 'reset'];

export const UNDEPLOYED_CONTRACT_ADDRESS = sampleContractAddress();
export const INVALID_CONTRACT_ADDRESS_TOO_LONG = `00${sampleContractAddress()}`;
export const INVALID_CONTRACT_ADDRESS_HEX_FORMAT = `${sampleContractAddress()}z`;
