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

import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { assertIsHex, parseHex } from './hex-utils';

/**
 * Asserts that a string represents a hex-encoded contract address.
 *
 * @param contractAddress The source string.
 *
 * @throws `TypeError`
 * `contractAddress` is not a correctly formatted {@link ContractAddress}.
 *
 * @internal
 */
export function assertIsContractAddress(contractAddress: string): asserts contractAddress is ContractAddress {
  const CONTRACT_ADDRESS_BYTE_LENGTH = 34;

  assertIsHex(contractAddress, CONTRACT_ADDRESS_BYTE_LENGTH);

  const parsedHex = parseHex(contractAddress);

  if (parsedHex.hasPrefix) {
    throw new TypeError(`Unexpected '0x' prefix in contract address '${contractAddress}'`);
  }
}
