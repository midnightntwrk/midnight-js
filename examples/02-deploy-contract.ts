/**
 * 02-deploy-contract.ts
 *
 * Shows how to deploy a Compact contract and call one of its circuits.
 *
 * The example uses a minimal counter contract:
 *   - initial state: { counter: 0n }
 *   - circuits: increment() and decrement()
 *
 * Run:
 *   tsx 02-deploy-contract.ts
 *
 * Note: Deploying a contract requires a connected wallet. The walletProvider
 * and midnightProvider stubs below must be replaced with real instances from
 * @midnight-ntwrk/wallet-sdk before this example will produce a transaction.
 */

import 'dotenv/config';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

// ---------------------------------------------------------------------------
// Types emitted by the Compact compiler for a counter.compact contract.
// In a real project these come from the generated .d.ts file.
// ---------------------------------------------------------------------------
interface CounterLedger {
  counter: bigint;
}

// Replace with the actual import once you have compiled counter.compact:
//   import { Contract, witnesses } from './counter/contract/index.cjs';
declare const Contract: unknown;
declare const witnesses: unknown;

// ---------------------------------------------------------------------------
// Setup (same as 01-providers.ts)
// ---------------------------------------------------------------------------
setNetworkId('testnet');

const {
  INDEXER_HTTP_URL = 'https://indexer.midnight.network/api/v1/graphql',
  INDEXER_WS_URL = 'wss://indexer.midnight.network/api/v1/graphql',
  PROOF_SERVER_URL = 'https://proof.midnight.network',
  ZK_CONFIG_BASE_URL = 'https://artifacts.midnight.network',
  PRIVATE_STATE_PASSWORD = 'example-password-replace-me',
} = process.env;

const zkConfigProvider = new FetchZkConfigProvider(ZK_CONFIG_BASE_URL);

const providers: MidnightProviders<CounterLedger, never, never, never> = {
  privateStateProvider: levelPrivateStateProvider({
    privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
    accountId: 'example-account',
  }),
  publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP_URL, INDEXER_WS_URL),
  zkConfigProvider,
  proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
  walletProvider: null as never,    // replace with real wallet provider
  midnightProvider: null as never,  // replace with real midnight provider
};

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------
async function main() {
  console.log('Deploying counter contract...');

  const deployed = await deployContract(providers, {
    // The JS module produced by `compactc counter.compact`
    contract: Contract as never,
    witnesses: witnesses as never,
    privateStateId: 'counter-state',
    initialPrivateState: {},
  });

  console.log('Contract deployed at address:', deployed.deployTxData.public.contractAddress);

  // ---------------------------------------------------------------------------
  // Call a circuit
  // ---------------------------------------------------------------------------
  console.log('Calling increment()...');
  const txData = await deployed.callTx.increment();
  console.log('Transaction hash:', txData.public.txHash);

  // Read the updated on-chain ledger state
  const ledger = await deployed.queryContractState('counter');
  console.log('Counter value after increment:', (ledger as CounterLedger).counter);
}

main().catch(console.error);
