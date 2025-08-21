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

import { Schema } from 'effect';
import { Args } from '@effect/cli';
import * as ContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';

export const contractArgs = Args.text({ name: 'arg' }).pipe(
  Args.withDescription('An argument that will be forwarded (in order), to the constructor or circuit being invoked.'),
  Args.repeated
);

export const contractAddress = Args.text({ name: 'contract_address' }).pipe(
  Args.withDescription('A contract address, hex-encoded.'),
  Args.withSchema(Schema.String.pipe(Schema.fromBrand(ContractAddress.ContractAddress)))
);

export const circuitId = Args.text({ name: 'circuit_id'}).pipe(
  Args.withDescription('A circuit identifier.')
);
