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

/**
 * A fixture that DOES NOT COMPILE, on purpose. It is not part of any build or test program: the
 * package `tsconfig.json` excludes this directory, and the only thing that ever compiles it is
 * `src/test/neither-era-diagnostic.test.ts`, which runs `tsc` over the sibling `tsconfig.json`
 * and asserts on the diagnostics the compiler prints.
 *
 * Each export below passes an object belonging to NEITHER contract era to one of the four
 * era-dispatching entry points, one call per LINE, because the test maps a reported line number
 * back to the entry point it belongs to. Keep every call on a single line, keep them the only
 * errors in this file, and do not add anything here that could fail to compile for another reason.
 */

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

import { deployContract } from '../../../deploy-contract';
import { findDeployedContract } from '../../../find-deployed-contract';
import type { Ledger8ContractProviders } from '../../../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../../../submit-call-tx';
import type { Counter016Contract } from '../../ledger8-fixture-types';

declare const providers: Ledger8ContractProviders<Counter016Contract, 'increment'>;
declare const contractAddress: ContractAddress;

/** Neither a `CompiledContract` container nor a retained-era contract instance. */
declare const neitherEraContract: { readonly nonsense: true };

export const call = submitCallTx(providers, { compiledContract: neitherEraContract, contractAddress, circuitId: 'increment', args: [] });
export const callAsync = submitCallTxAsync(providers, { compiledContract: neitherEraContract, contractAddress, circuitId: 'increment', args: [] });
export const deploy = deployContract(providers, { compiledContract: neitherEraContract });
export const found = findDeployedContract(providers, { compiledContract: neitherEraContract, contractAddress });
