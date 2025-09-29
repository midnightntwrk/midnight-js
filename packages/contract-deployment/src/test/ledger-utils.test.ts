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

import {
  ContractState,
  QueryContext,
  sampleContractAddress,
  sampleSigningKey,
} from '@midnight-ntwrk/ledger';

import {
  contractMaintenanceAuthority,
  fromLedgerContractState,
  toLedgerContractState,
  toLedgerQueryContext,
} from '../ledger-utils';

describe('ledger-utils', () => {
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new ContractState();
  const dummyContractAddress = sampleContractAddress();

  it('toLedgerContractState and fromLedgerContractState are inverses', () => {
    const ledgerState = toLedgerContractState(dummyContractState);
    const roundTrip = fromLedgerContractState(ledgerState);
    expect(roundTrip.constructor.name).toBe('ContractState');
    expect(roundTrip).toHaveProperty('maintenanceAuthority');
  });

  it('toLedgerQueryContext returns a LedgerQueryContext', () => {
    const queryContext = new QueryContext(dummyContractState.data, dummyContractAddress);
    const ledgerQueryContext = toLedgerQueryContext(queryContext);
    expect(ledgerQueryContext.address).toEqual(queryContext.address);
    // RuntimeError: unreachable
    // WASM Error
  });

  it('contractMaintenanceAuthority returns a valid authority', () => {
    const authority = contractMaintenanceAuthority(dummySigningKey, dummyContractState);
    expect(authority.threshold).toBe(1);
    expect(authority.committee.length).toBe(1);
    expect(authority.counter).toBe(1n);
  });

  it('contractMaintenanceAuthority without contract state starts at 0', () => {
    const authority = contractMaintenanceAuthority(dummySigningKey);

    expect(authority.counter).toBe(0n);
    expect(authority.threshold).toBe(1);
    expect(authority.committee.length).toBe(1);
  });

  it('contractMaintenanceAuthority handles different signing keys', () => {
    const authority1 = contractMaintenanceAuthority(dummySigningKey);
    const authority2 = contractMaintenanceAuthority(dummySigningKey2);

    expect(authority1).toBeDefined();
    expect(authority2).toBeDefined();
    expect(authority1.threshold).toBe(authority2.threshold);
    expect(authority1.committee.length).toBe(authority2.committee.length);
  });
});
