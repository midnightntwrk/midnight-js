/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { sampleCoinPublicKey, sampleEncryptionPublicKey } from '@midnight-ntwrk/ledger-v8';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseCoinPublicKeyToHex,parseEncPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';

import { deployContract } from '../deploy-contract';
import { createCircuitCallTxInterface } from '../tx-interfaces';
import { createEncryptionPublicKeyResolver, encryptionPublicKeyResolverForZswapState } from '../utils';
import {
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContractAddress,
  createMockContractState,
  createMockEncryptionPublicKey,
  createMockFinalizedTxData,
  createMockProviders,
  createMockSigningKey
} from './test-mocks';

vi.mock('../submit-deploy-tx', () => ({ submitDeployTx: vi.fn() }));
vi.mock('../submit-call-tx', () => ({ submitCallTx: vi.fn() }));

describe('EncryptionPublicKeyResolver with additional mappings', () => {
  it('deployContract forwards additionalCoinEncPublicKeyMappings to submitDeployTx', async () => {
    const { submitDeployTx } = await import('../submit-deploy-tx');
    const mockSubmitDeployTx = submitDeployTx as unknown as ReturnType<typeof vi.fn>;
    const providers = createMockProviders();
    const mappings = new Map([[createMockCoinPublicKey(), createMockEncryptionPublicKey()]]);
    const options = {
      compiledContract: createMockCompiledContract(),
      args: ['deploy-arg'],
      additionalCoinEncPublicKeyMappings: mappings
    };

    const deployTxData = {
      public: {
        ...createMockFinalizedTxData(),
        contractAddress: createMockContractAddress(),
        initialContractState: createMockContractState()
      },
      private: {
        signingKey: createMockSigningKey(),
        initialPrivateState: undefined,
        initialZswapState: {},
        unprovenTx: {},
        newCoins: []
      }
    };

    mockSubmitDeployTx.mockResolvedValue(deployTxData);

    await deployContract(providers, options);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({ additionalCoinEncPublicKeyMappings: mappings })
    );
  });

  it('createCircuitCallTxInterface includes additional mappings from TransactionContext in call options', async () => {
    const { submitCallTx } = await import('../submit-call-tx');
    vi.mocked(submitCallTx).mockResolvedValue({ public: {} as any, private: {} as any });

    const providers = createMockProviders();
    const compiledContract = createMockCompiledContract();
    const contractAddress = createMockContractAddress();
    const mappings = new Map([[createMockCoinPublicKey(), createMockEncryptionPublicKey()]]);

    const callInterface = createCircuitCallTxInterface(providers, compiledContract, contractAddress, undefined);
    const { TransactionContextImpl } = await import('../internal/transaction');

    const txCtx = new TransactionContextImpl(providers, { additionalCoinEncPublicKeyMappings: mappings });
    await (callInterface.testCircuit as unknown as (txCtx?: any, ...args: any[]) => Promise<any>)(txCtx, 'arg1');

    expect(submitCallTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({ additionalCoinEncPublicKeyMappings: mappings }),
      txCtx
    );
  });

  it('createEncryptionPublicKeyResolver and encryptionPublicKeyResolverForZswapState normalize mappings', async () => {
    setNetworkId('testnet');

    const walletCpk = sampleCoinPublicKey();
    const walletEpk = sampleEncryptionPublicKey();
    const thirdCpk = sampleCoinPublicKey();
    const thirdEpk = sampleEncryptionPublicKey();

    const mappings = new Map([[thirdCpk, thirdEpk]]);

    const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk, mappings);
    const queryKeyHex = parseCoinPublicKeyToHex(thirdCpk, getNetworkId());
    const expected = parseEncPublicKeyToHex(thirdEpk, getNetworkId());

    expect(resolver(queryKeyHex)).toBe(expected);

    const zswapState = { coinPublicKey: walletCpk } as any;
    const resolver2 = encryptionPublicKeyResolverForZswapState(zswapState, walletCpk, walletEpk, mappings);
    expect(resolver2(queryKeyHex)).toBe(expected);
  });
});
