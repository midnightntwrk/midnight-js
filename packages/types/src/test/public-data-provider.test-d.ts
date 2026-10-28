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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import type { Observable } from 'rxjs';
import { describe, expectTypeOf, it } from 'vitest';

import type { ContractStateAndParametersRead, ContractStateRead, PublicStatesRead } from '../contract-state-read';
import type { LedgerState } from '../ledger-state';
import type { UnshieldedBalances } from '../midnight-types';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  PositionedRecord,
  PublicDataProvider
} from '../public-data-provider';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` case, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package, enabled unconditionally in
// `vitest.config.ts`, which surfaces `tsc` diagnostics against this file as
// test failures; a plain `yarn test` runs them.

// Spelled out independently of the records, so the equality checks pin their shapes rather than
// restating them.
type ContractStateReadFixture = {
  readonly protocolVersion: number;
  readonly contractState: LedgerState<'ContractState'>;
};

type ContractStateAndParametersReadFixture = {
  readonly protocolVersion: number;
  readonly contractState: LedgerState<'ContractState'>;
  readonly ledgerParameters: LedgerState<'LedgerParameters'>;
};

type PublicStatesReadFixture = {
  readonly protocolVersion: number;
  readonly contractState: LedgerState<'ContractState'>;
  readonly ledgerParameters: LedgerState<'LedgerParameters'>;
  readonly zswapChainState: LedgerState<'ZswapChainState'>;
};

type PositionedRecordFixture<T> = {
  readonly value: T;
  readonly blockHeight: number;
  readonly blockHash: string;
};

type Without<K extends keyof PublicDataProvider> = Omit<PublicDataProvider, K>;

describe('read records', () => {
  it('pins ContractStateRead to exactly its two fields', () => {
    expectTypeOf<ContractStateRead>().toEqualTypeOf<ContractStateReadFixture>();
  });

  it('pins ContractStateAndParametersRead to exactly its three fields, with the ledger parameters required', () => {
    expectTypeOf<ContractStateAndParametersRead>().toEqualTypeOf<ContractStateAndParametersReadFixture>();
  });

  it('pins PublicStatesRead to exactly its four fields, with the ledger parameters required', () => {
    expectTypeOf<PublicStatesRead>().toEqualTypeOf<PublicStatesReadFixture>();
  });

  it('carries no decoded state, so a framework runtime object is never handed out', () => {
    expectTypeOf<ContractStateRead['contractState']>().not.toExtend<ContractState>();
  });
});

describe('contract state reads', () => {
  it('pins queryContractState to the read record with the ledger parameters, or null', () => {
    expectTypeOf<PublicDataProvider['queryContractState']>().toEqualTypeOf<
      (
        contractAddress: ContractAddress,
        config?: BlockHeightConfig | BlockHashConfig
      ) => Promise<ContractStateAndParametersReadFixture | null>
    >();
  });

  it('pins watchForContractState to the read record', () => {
    expectTypeOf<PublicDataProvider['watchForContractState']>().toEqualTypeOf<
      (contractAddress: ContractAddress) => Promise<ContractStateReadFixture>
    >();
  });

  it('pins queryDeployContractState to the read record, or null', () => {
    expectTypeOf<PublicDataProvider['queryDeployContractState']>().toEqualTypeOf<
      (contractAddress: ContractAddress) => Promise<ContractStateReadFixture | null>
    >();
  });

  it('pins queryZSwapAndContractState to the public states record, or null', () => {
    expectTypeOf<PublicDataProvider['queryZSwapAndContractState']>().toEqualTypeOf<
      (contractAddress: ContractAddress, config?: BlockHeightConfig | BlockHashConfig) => Promise<PublicStatesReadFixture | null>
    >();
  });

  it('has no raw-state members any more', () => {
    expectTypeOf<PublicDataProvider>().not.toHaveProperty('queryRawContractState');
    expectTypeOf<PublicDataProvider>().not.toHaveProperty('rawContractStateObservable');
  });
});

describe('positioned stream members', () => {
  it('pins contractStateObservable to positioned read records', () => {
    expectTypeOf<PublicDataProvider['contractStateObservable']>().toEqualTypeOf<
      (address: ContractAddress, config: ContractStateObservableConfig) => Observable<PositionedRecordFixture<ContractStateReadFixture>>
    >();
  });

  it('pins unshieldedBalancesObservable to positioned balances', () => {
    expectTypeOf<PublicDataProvider['unshieldedBalancesObservable']>().toEqualTypeOf<
      (address: ContractAddress, config: ContractStateObservableConfig) => Observable<PositionedRecordFixture<UnshieldedBalances>>
    >();
  });
});

describe('queryLatestProtocolVersion', () => {
  it('is a required member', () => {
    // @ts-expect-error `queryLatestProtocolVersion` is a required member.
    const provider: PublicDataProvider = {} as Without<'queryLatestProtocolVersion'>;

    expectTypeOf(provider).not.toBeAny();
  });

  it('is a no-argument query resolving to a version integer', () => {
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toEqualTypeOf<() => Promise<number>>();
  });

  it('takes no options bag, so no caller can ask for a cached answer', () => {
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith();
    // @ts-expect-error The member reads the network on every call, so there is no freshness option to pass.
    expectTypeOf<PublicDataProvider['queryLatestProtocolVersion']>().toBeCallableWith({ fresh: true });
  });
});

describe('PositionedRecord', () => {
  it('pins PositionedRecord to exactly value, blockHeight and blockHash', () => {
    expectTypeOf<PositionedRecord<ContractStateRead>>().toEqualTypeOf<PositionedRecordFixture<ContractStateRead>>();
  });

  it('types its position like the block configs, so a record resumes a stream unchanged', () => {
    expectTypeOf<PositionedRecord<ContractStateRead>['blockHeight']>().toEqualTypeOf<BlockHeightConfig['blockHeight']>();
    expectTypeOf<PositionedRecord<ContractStateRead>['blockHash']>().toEqualTypeOf<BlockHashConfig['blockHash']>();
  });

  it('wraps into a stream config without a cast', () => {
    const record = {} as PositionedRecord<ContractStateRead>;

    expectTypeOf({ type: 'blockHeight', blockHeight: record.blockHeight } as const).toExtend<ContractStateObservableConfig>();
    expectTypeOf({ type: 'blockHash', blockHash: record.blockHash } as const).toExtend<ContractStateObservableConfig>();
  });
});
