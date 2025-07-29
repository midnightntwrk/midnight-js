/*
 * This file is part of compact-js.
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
import { SigningKey as SigningKey_ } from '@midnight-ntwrk/compact-runtime';

/**
 * A public BIP-340 signing key, with a 3-byte version prefix.
 *
 * @remarks
 * A signing key is used to create a Contract Maintenance Authority (CMA) when initializing a new contract.
 * It is used to create a verifying key that is included in the contract deployment data that will
 * eventually be stored on the Midnight network.
 *
 * @category keys
 */
export type SigningKey = Brand.Branded<SigningKey_, 'SigningKey'>;
export const SigningKey = Brand.nominal<SigningKey>();
