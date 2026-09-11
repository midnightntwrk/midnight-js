/**
 * 03-find-contract.ts
 *
 * Shows how to locate and interact with a contract that was already
 * deployed in a previous session, using only its on-chain address.
 *
 * Run:
 *   CONTRACT_ADDRESS=<address> tsx 03-find-contract.ts
 */

import 'dotenv/config';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

// See 02-deploy-contract.ts for the full type definitions.
interface CounterLedger { counter: bigint }
declare const Contract: unknown;
declare const witnesses: unknown;

setNetworkId('testnet');

const {
  INDEXER_HTTP_URL = 'https://indexer.midnight.network/api/v1/graphql',
  INDEXER_WS_URL = 'wss://indexer.midnight.network/api/v1/graphql',
  PROOF_SERVER_URL = 'https://proof.midnight.network',
  ZK_CONFIG_BASE_URL = 'https://artifacts.midnight.network',
  PRIVATE_STATE_PASSWORD = 'example-password-replace-me',
  CONTRACT_ADDRESS,
} = process.env;

if (!CONTRACT_ADDRESS) {
  console.error('Usage: CONTRACT_ADDRESS=<address> tsx 03-find-contract.ts');
  process.exit(1);
}

const zkConfigProvider = new FetchZkConfigProvider(ZK_CONFIG_BASE_URL);

const providers: MidnightProviders<CounterLedger, never, never, never> = {
  privateStateProvider: levelPrivateStateProvider({
    privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
    accountId: 'example-account',
  }),
  publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP_URL, INDEXER_WS_URL),
  zkConfigProvider,
  proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
  walletProvider: null as never,
  midnightProvider: null as never,
};

async function main() {
  console.log('Looking up contract at:', CONTRACT_ADDRESS);

  const contract = await findDeployedContract(providers, {
    contractAddress: CONTRACT_ADDRESS,
    contract: Contract as never,
    witnesses: witnesses as never,
    privateStateId: 'counter-state',
    initialPrivateState: {},
  });

  const ledger = await contract.queryContractState('counter');
  console.log('Current counter value:', (ledger as CounterLedger).counter);
}

main().catch(console.error);
