import { type LedgerParameters } from '@midnight-ntwrk/ledger-v6';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';

import { type EnvironmentConfiguration } from '@/test-environment';

export interface MapperOptions {
  readonly networkId?: string;
  readonly additionalFeeOverhead?: bigint;
  readonly ledgerParams?: LedgerParameters;
}

export function mapEnvironmentToConfiguration(
  env: EnvironmentConfiguration,
): DefaultV1Configuration {
  return {
    indexerClientConnection: {
      indexerHttpUrl: env.indexer,
      indexerWsUrl: env.indexerWS,
    },
    provingServerUrl: new URL(env.proofServer),
    relayURL: new URL(env.node),
    networkId: env.walletNetworkId,
  };
}
