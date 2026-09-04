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
 * `src/test/current-era-diagnostic.test.ts`, which runs `tsc` over the sibling `tsconfig.json` and
 * asserts on the diagnostics the compiler prints.
 *
 * Every call below is an ordinary CURRENT-era call with an ordinary mistake in it: a typo'd circuit
 * id, or a private state of the wrong type. This is the COMMON way these entry points are called
 * wrongly, and the point of the test is that the compiler still names the real cause even though
 * the retained-era arm has been added alongside. Adding an arm at the END of any of these overload
 * lists is what would break that, because that is the arm whose error gets printed.
 *
 * One call per LINE, because the test maps a reported line number back to the entry point it
 * belongs to. Keep them the only errors in this file, and give each one exactly one mistake.
 */

import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

import type { Contract as Twin018Contract } from '../../../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js';
import type { ContractProviders } from '../../../contract-providers';
import { deployContract } from '../../../deploy-contract';
import { findDeployedContract } from '../../../find-deployed-contract';
import { submitCallTx, submitCallTxAsync } from '../../../submit-call-tx';

/** The private state of the real current-era twin fixture, named so the compiler prints the name. */
type Twin018PrivateState = { readonly round: bigint };
type Twin018 = Twin018Contract<Twin018PrivateState>;

declare const providers: ContractProviders<Twin018, 'increment'>;
declare const compiledContract: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
declare const contractAddress: ContractAddress;

// Mistake: the circuit is called `increment`.
export const call = submitCallTx(providers, { compiledContract, contractAddress, circuitId: 'incremnt', privateStateId: 'counter' });
export const callAsync = submitCallTxAsync(providers, { compiledContract, contractAddress, circuitId: 'incremnt', privateStateId: 'counter' });
// Mistake: the private state is a `Twin018PrivateState`, not a string.
export const deployed = deployContract(providers, { compiledContract, privateStateId: 'counter', initialPrivateState: 'not a private state' });
export const found = findDeployedContract(providers, { compiledContract, contractAddress, privateStateId: 'counter', initialPrivateState: 'not a private state' });
