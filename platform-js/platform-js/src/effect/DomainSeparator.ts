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

import { Brand } from 'effect';

import * as Hex from './Hex.js';

/**
 * A plain hex-encoded token domain separator, 32 bytes in length.
 * 
 * @category models
 */
export type DomainSeparator = Brand.Branded<string, 'DomainSeparator'>;
export const DomainSeparator = Brand.all(
  Brand.nominal<DomainSeparator>(),
  Hex.ConstrainedPlainHex({ byteLength: '32..=32' })
);

/**
 * Creates a buffer representing the raw bytes of a token domain separator.
 * 
 * @param self The {@link DomainSeparator} for which raw bytes are required.
 * @returns A `Uint8Array` representing the raw bytes of `self`.
 * 
 * @category constructors
 */
export const asBytes: (self: DomainSeparator) => Uint8Array = (self) => Buffer.from(self, 'hex');
