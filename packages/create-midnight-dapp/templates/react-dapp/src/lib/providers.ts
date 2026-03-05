import { webcrypto } from '@midnight-ntwrk/midnight-js-utils';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export async function createProviders(
  wallet: ConnectedAPI,
  contractName: string
): Promise<MidnightProviders<string>> {
  const config = await wallet.getConfiguration();
  const state = await wallet.getState();

  return {
    privateStateProvider: levelPrivateStateProvider({ contractName }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri,
      config.indexerWsUri,
      webcrypto
    ),
    zkConfigProvider: fetchZkConfigProvider(window.location.origin, fetch.bind(window)),
    proofProvider: httpClientProofProvider(config.proverServerUri),
    walletProvider: {
      coinPublicKey: state.coinPublicKey,
      balanceTx: (tx, newCoins) => wallet.balanceTransaction(tx, newCoins),
    },
    midnightProvider: {
      submitTx: (tx) => wallet.submitTransaction(tx),
    },
  };
}
