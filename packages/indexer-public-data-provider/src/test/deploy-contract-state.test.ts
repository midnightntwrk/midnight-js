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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { VersionedContractState } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, test, vi } from 'vitest';

import { IndexerDataError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { DEPLOY_CONTRACT_STATE_TX_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  LEDGER8_ERA_PROTOCOL_VERSION,
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger8ContractStateBytes,
  mintLedger8ContractStateHex,
  mintLedger9ContractStateBytes,
  mintLedger9ContractStateHex
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const OTHER_ADDRESS = '34'.repeat(32) as ContractAddress;

type ActionArm = 'ContractDeploy' | 'ContractUpdate' | 'ContractCall';

/** The transaction carrying the record the deploy state is read from, dated by the record's own `stateAt`. */
const recordTransaction = (state: string, protocolVersion: number, address: string = ADDRESS) => ({
  contractActions: [{ address, state, stateAt: { protocolVersion } }]
});

/**
 * One `DEPLOY_CONTRACT_STATE_TX_QUERY` answer, shaped by the arm the contract's latest action
 * resolves to: a call reaches the deploy through `deploy`, the other two through their own
 * transaction.
 */
const answer = (arm: ActionArm, transaction: ReturnType<typeof recordTransaction>): unknown =>
  arm === 'ContractCall' ? { contractAction: { deploy: { transaction } } } : { contractAction: { transaction } };

const providerAnswering = (data: unknown) => {
  const query = vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue({ data });
  return { provider: new IndexerPublicDataProvider(stubApolloHandle({ query }), 1000), query };
};

const serialized = (result: VersionedContractState | null): { version: string; bytes: number[] } | null => {
  if (result === null) return null;
  switch (result.version) {
    case 'v8':
      return { version: 'v8', bytes: Array.from(result.stateBytes) };
    case 'v9':
      return { version: 'v9', bytes: Array.from(result.state.serialize()) };
  }
};

const ARMS: readonly ActionArm[] = ['ContractDeploy', 'ContractUpdate', 'ContractCall'];

describe('queryDeployContractState', () => {
  test.each(ARMS)('%s: a v9 deploy comes back decoded, tagged v9', async (arm) => {
    const { provider, query } = providerAnswering(
      answer(arm, recordTransaction(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION))
    );

    const result = await provider.queryDeployContractState(ADDRESS);

    expect(serialized(result)).toEqual({ version: 'v9', bytes: Array.from(mintLedger9ContractStateBytes()) });
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ query: DEPLOY_CONTRACT_STATE_TX_QUERY }));
  });

  test.each(ARMS)('%s: a v8 deploy comes back as the stored bytes, tagged v8', async (arm) => {
    const { provider } = providerAnswering(
      answer(arm, recordTransaction(await mintLedger8ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION))
    );

    const result = await provider.queryDeployContractState(ADDRESS);

    expect(serialized(result)).toEqual({ version: 'v8', bytes: Array.from(await mintLedger8ContractStateBytes()) });
  });

  test('refuses a deploy state whose envelope is newer than the block that dates it', async () => {
    const { provider } = providerAnswering(
      answer('ContractCall', recordTransaction(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION))
    );

    const rejection = await provider.queryDeployContractState(ADDRESS).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      envelopeVersion: 'v9'
    });
  });

  test('refuses a deploy transaction that carries no action for the address', async () => {
    const { provider } = providerAnswering(
      answer('ContractCall', recordTransaction(mintLedger9ContractStateHex(), LEDGER9_ERA_PROTOCOL_VERSION, OTHER_ADDRESS))
    );

    const rejection = await provider.queryDeployContractState(ADDRESS).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'missing-contract-action',
      contractAddress: ADDRESS
    });
  });

  test('returns null for an address with no contract action', async () => {
    const { provider } = providerAnswering({ contractAction: null });

    const result = await provider.queryDeployContractState(ADDRESS);

    expect(result).toBeNull();
  });
});
