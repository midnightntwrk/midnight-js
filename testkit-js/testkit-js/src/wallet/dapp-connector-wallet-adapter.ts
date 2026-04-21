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

import type {
  Configuration,
  ConnectedAPI,
  ConnectionStatus,
  DesiredInput,
  DesiredOutput,
  HistoryEntry,
  KeyMaterialProvider as DAppKeyMaterialProvider,
  ProvingProvider,
  Signature,
  SignDataOptions,
  TokenType,
  WalletConnectedAPI,
} from '@midnight-ntwrk/dapp-connector-api';
import { Transaction as LedgerTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex, toHex, ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { DustAddress, MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import type { BalancingRecipe } from '@midnight-ntwrk/wallet-sdk-facade';
import { WasmProver } from '@midnight-ntwrk/wallet-sdk-prover-client/effect';
import {
  type KeyMaterialProvider as ZkirKeyMaterialProvider,
  provingProvider as createLocalProvingProvider,
} from '@midnight-ntwrk/zkir-v2';
import { firstValueFrom } from 'rxjs';

import type { EnvironmentConfiguration } from '@/test-environment/environment-configuration';

import type { MidnightWalletProvider } from './midnight-wallet-provider';

export class DAppConnectorWalletAdapter implements ConnectedAPI {
  private readonly walletProvider: Pick<MidnightWalletProvider, 'wallet' | 'unshieldedKeystore' | 'zswapSecretKeys' | 'dustSecretKey'>;
  private readonly environmentConfiguration: EnvironmentConfiguration;
  private cachedDefaultKeyMaterialProvider?: ZkirKeyMaterialProvider;

  constructor(
    walletProvider: Pick<MidnightWalletProvider, 'wallet' | 'unshieldedKeystore' | 'zswapSecretKeys' | 'dustSecretKey'>,
    environmentConfiguration: EnvironmentConfiguration,
  ) {
    this.walletProvider = walletProvider;
    this.environmentConfiguration = environmentConfiguration;
  }

  async getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }> {
    const state = await firstValueFrom(this.walletProvider.wallet.shielded.state);
    return {
      shieldedAddress: MidnightBech32m.encode(this.environmentConfiguration.networkId, state.address).asString(),
      shieldedCoinPublicKey: state.address.coinPublicKeyString(),
      shieldedEncryptionPublicKey: state.address.encryptionPublicKeyString(),
    };
  }

  async getUnshieldedAddress(): Promise<{ unshieldedAddress: string }> {
    return {
      unshieldedAddress: this.walletProvider.unshieldedKeystore.getBech32Address().asString(),
    };
  }

  async getDustAddress(): Promise<{ dustAddress: string }> {
    return {
      dustAddress: DustAddress.encodePublicKey(
        this.environmentConfiguration.networkId,
        this.walletProvider.dustSecretKey.publicKey,
      ),
    };
  }

  async getShieldedBalances(): Promise<Record<TokenType, bigint>> {
    const state = await firstValueFrom(this.walletProvider.wallet.shielded.state);
    return state.balances;
  }

  async getUnshieldedBalances(): Promise<Record<TokenType, bigint>> {
    const state = await firstValueFrom(this.walletProvider.wallet.unshielded.state);
    return state.balances;
  }

  async getDustBalance(): Promise<{ cap: bigint; balance: bigint }> {
    const state = await firstValueFrom(this.walletProvider.wallet.dust.state);
    return {
      balance: state.balance(new Date()),
      cap: 0n,
    };
  }

  async balanceUnsealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }> {
    const unboundTx = LedgerTransaction.deserialize('signature', 'proof', 'preBinding', fromHex(tx));
    const tokenKindsToBalance = options?.payFees === false ? (['shielded', 'unshielded'] as const) : ('all' as const);
    const recipe = await this.walletProvider.wallet.balanceUnboundTransaction(
      unboundTx,
      this.secretKeys(),
      { ttl: ttlOneHour(), tokenKindsToBalance },
    );
    return this.signAndFinalize(recipe);
  }

  async balanceSealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }> {
    const finalizedTx = LedgerTransaction.deserialize('signature', 'proof', 'binding', fromHex(tx));
    const tokenKindsToBalance = options?.payFees === false ? (['shielded', 'unshielded'] as const) : ('all' as const);
    const recipe = await this.walletProvider.wallet.balanceFinalizedTransaction(
      finalizedTx,
      this.secretKeys(),
      { ttl: ttlOneHour(), tokenKindsToBalance },
    );
    return this.signAndFinalize(recipe);
  }

  async submitTransaction(tx: string): Promise<void> {
    const finalizedTx = LedgerTransaction.deserialize('signature', 'proof', 'binding', fromHex(tx));
    await this.walletProvider.wallet.submitTransaction(finalizedTx);
  }

  async signData(data: string, options: SignDataOptions): Promise<Signature> {
    let bytes: Uint8Array;
    switch (options.encoding) {
      case 'hex':
        bytes = fromHex(data);
        break;
      case 'base64':
        bytes = Buffer.from(data, 'base64');
        break;
      case 'text':
        bytes = Buffer.from(data, 'utf-8');
        break;
    }
    const signature = this.walletProvider.unshieldedKeystore.signData(bytes);
    return {
      data,
      signature,
      verifyingKey: this.walletProvider.unshieldedKeystore.getPublicKey(),
    };
  }

  async getProvingProvider(keyMaterialProvider: DAppKeyMaterialProvider): Promise<ProvingProvider> {
    const defaultProvider = this.getDefaultKeyMaterialProvider();
    const zkirProvider: ZkirKeyMaterialProvider = {
      async lookupKey(keyLocation: string) {
        try {
          const [ir, proverKey, verifierKey] = await Promise.all([
            keyMaterialProvider.getZKIR(keyLocation),
            keyMaterialProvider.getProverKey(keyLocation),
            keyMaterialProvider.getVerifierKey(keyLocation),
          ]);
          return { ir, proverKey, verifierKey };
        } catch (error) {
          console.debug(`DApp key material lookup failed for '${keyLocation}', falling back to default provider`, error);
          return defaultProvider.lookupKey(keyLocation);
        }
      },
      async getParams(k: number) {
        return defaultProvider.getParams(k);
      },
    };
    return createLocalProvingProvider(zkirProvider);
  }

  async getConfiguration(): Promise<Configuration> {
    return {
      indexerUri: this.environmentConfiguration.indexer,
      indexerWsUri: this.environmentConfiguration.indexerWS,
      proverServerUri: this.environmentConfiguration.proofServer,
      substrateNodeUri: this.environmentConfiguration.node,
      networkId: this.environmentConfiguration.networkId,
    };
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return { status: 'connected', networkId: this.environmentConfiguration.networkId };
  }

  async hintUsage(_methodNames: (keyof WalletConnectedAPI)[]): Promise<void> {
    // No-op for test wallet
  }

  async makeTransfer(
    _desiredOutputs: DesiredOutput[],
    _options?: { payFees?: boolean },
  ): Promise<{ tx: string }> {
    throw new Error('Not implemented in DAppConnectorWalletAdapter');
  }

  async makeIntent(
    _desiredInputs: DesiredInput[],
    _desiredOutputs: DesiredOutput[],
    _options: { intentId: number | 'random'; payFees: boolean },
  ): Promise<{ tx: string }> {
    throw new Error('Not implemented in DAppConnectorWalletAdapter');
  }

  async getTxHistory(_pageNumber: number, _pageSize: number): Promise<HistoryEntry[]> {
    throw new Error('Not implemented in DAppConnectorWalletAdapter');
  }

  private secretKeys() {
    return {
      shieldedSecretKeys: this.walletProvider.zswapSecretKeys,
      dustSecretKey: this.walletProvider.dustSecretKey,
    };
  }

  private async signAndFinalize(recipe: BalancingRecipe): Promise<{ tx: string }> {
    const signed = await this.walletProvider.wallet.signRecipe(recipe, (payload) =>
      this.walletProvider.unshieldedKeystore.signData(payload),
    );
    const finalized = await this.walletProvider.wallet.finalizeRecipe(signed);
    return { tx: toHex(finalized.serialize()) };
  }

  private getDefaultKeyMaterialProvider(): ZkirKeyMaterialProvider {
    this.cachedDefaultKeyMaterialProvider ??= WasmProver.makeDefaultKeyMaterialProvider();
    return this.cachedDefaultKeyMaterialProvider;
  }
}
