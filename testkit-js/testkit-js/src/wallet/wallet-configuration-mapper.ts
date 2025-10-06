import { LedgerParameters } from '@midnight-ntwrk/ledger-v6';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';

import { type EnvironmentConfiguration } from '@/test-environment';
import { NetworkId } from '@midnight-ntwrk/zswap';

export interface MapperOptions {
  readonly networkId?: string;
  readonly additionalFeeOverhead?: bigint;
  readonly ledgerParams?: LedgerParameters;
}

export function mapEnvironmentToConfiguration(
  env: EnvironmentConfiguration,
  options: MapperOptions = {},
): DefaultV1Configuration {
  const {
    networkId = 'undeployed',
    additionalFeeOverhead = 50_000n,
    ledgerParams = LedgerParameters.initialParameters(),
  } = options;

  return {
    indexerClientConnection: {
      indexerHttpUrl: env.indexer,
      indexerWsUrl: env.indexerWS,
    },
    provingServerUrl: new URL(env.proofServer),
    relayURL: new URL(env.node),
    networkId: NetworkId.Undeployed,
    costParameters: {
      ledgerParams,
      additionalFeeOverhead,
    },
  };
}
