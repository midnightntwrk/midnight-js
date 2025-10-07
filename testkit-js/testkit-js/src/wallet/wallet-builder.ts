import { ZswapSecretKeys } from '@midnight-ntwrk/ledger-v6';
import { type NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';
import {
  createKeystore,
  PublicKey,
  type UnshieldedWallet,
  WalletBuilder as UnshieldedWalletBuilder
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

import type { EnvironmentConfiguration } from '@/index';
import { mapEnvironmentToConfiguration } from '@/wallet/wallet-configuration-mapper';
import { getShieldedSeed, getUnshieldedSeed } from '@/wallet/wallet-seed-utils';

export class WalletBuilder {
  static buildShieldedWallet(config: DefaultV1Configuration, seed: Uint8Array): ShieldedWallet {
    const Shielded = ShieldedWallet(config);
    return Shielded.startWithShieldedSeed(seed);
  }

  static async buildUnshieldedWallet(
    config: DefaultV1Configuration,
    seed: Uint8Array,
    networkId: NetworkId.NetworkId
  ): Promise<UnshieldedWallet> {
    const keystore = createKeystore(seed, networkId);
    return await UnshieldedWalletBuilder.build({
      publicKey: PublicKey.fromKeyStore(keystore),
      networkId,
      indexerUrl: config.indexerClientConnection.indexerWsUrl!,
    });
  }

  static async restoreShieldedWallet(
    config: DefaultV1Configuration,
    serializedState: string
  ): Promise<ShieldedWallet> {
    return ShieldedWallet(config).restore(serializedState);
  }

  static async buildWallet(
    envConfig: EnvironmentConfiguration,
    shieldedSeed: Uint8Array,
    unshieldedSeed: Uint8Array
  ): Promise<WalletFacade> {
    const config = mapEnvironmentToConfiguration(envConfig);
    return new WalletFacade(
      this.buildShieldedWallet(config, shieldedSeed),
      await this.buildUnshieldedWallet(config, unshieldedSeed, envConfig.walletNetworkId)
    );
  }

  static async startWallet(wallet: WalletFacade, seed: Uint8Array): Promise<WalletFacade> {
    await wallet.start(ZswapSecretKeys.fromSeed(seed));
    return wallet;
  }

  static async buildAndStartWallet(
    envConfig: EnvironmentConfiguration,
    seed?: string
  ): Promise<WalletFacade> {
    const walletSeed = seed ?? generateRandomSeed().toString();
    const shieldedSeed = getShieldedSeed(walletSeed);
    const unshieldedSeed = getUnshieldedSeed(walletSeed);

    const wallet = await this.buildWallet(envConfig, shieldedSeed, unshieldedSeed);
    return this.startWallet(wallet, shieldedSeed);
  }
}
