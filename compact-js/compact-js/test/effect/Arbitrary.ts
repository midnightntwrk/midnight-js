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

import * as ContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as DomainSeparator from '@midnight-ntwrk/platform-js/effect/DomainSeparator';
import * as fc from 'effect/FastCheck';

export const makeDomainSeparatorArbitrary: () => fc.Arbitrary<DomainSeparator.DomainSeparator> =
  () => fc.stringMatching(/^[0-9a-f]{64}$/).map(DomainSeparator.DomainSeparator);

export const makeContractAddressArbitrary: () => fc.Arbitrary<ContractAddress.ContractAddress> =
  () => fc.stringMatching(/^[0-9a-f]{64}$/).map(ContractAddress.ContractAddress);

export const getSampleDomainSeparator: () => DomainSeparator.DomainSeparator =
  (() => {
    const arbitrary = makeDomainSeparatorArbitrary();
    return () => fc.sample(arbitrary, 1)[0];
  })();

export const getSampleContractAddress: () => ContractAddress.ContractAddress =
  (() => {
    const arbitrary = makeContractAddressArbitrary();
    return () => fc.sample(arbitrary, 1)[0];
  })();