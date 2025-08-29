/*
 * This file is part of platform-js.
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

import { Brand } from 'effect';
import * as Hex from './Hex.js';

/**
 * A plain hex-encoded contract address, 34 to 35 bytes in length.
 * 
 * @remarks
 * The optional first byte represents a hex-encoded network identifier.
 * 
 * @category models
 */
export type ContractAddress = Brand.Branded<string, 'ContractAddress'>;
export const ContractAddress = Brand.all(
  Brand.nominal<ContractAddress>(),
  Hex.ConstrainedPlainHex({ byteLength: '34..=35' })
);
