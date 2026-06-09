/**
 * 01-providers.ts
 *
 * Shows how to assemble the MidnightProviders object that every
 * contract deployment and call requires.
 *
 * Run:
 *   tsx 01-providers.ts
 */

import 'dotenv/config';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

// 1. Choose the network.
//    Valid values: 'devnet' | 'testnet' | 'mainnet'
setNetworkId('testnet');

// 2. Read configuration from environment variables (see ../.env.example).
const {
  INDEXER_HTTP_URL = 'https://indexer.midnight.network/api/v1/graphql',
  INDEXER_WS_URL = 'wss://indexer.midnight.network/api/v1/graphql',
  PROOF_SERVER_URL = 'https://proof.midnight.network',
  ZK_CONFIG_BASE_URL = 'https://artifacts.midnight.network',
  PRIVATE_STATE_PASSWORD,
} = process.env;

if (!PRIVATE_STATE_PASSWORD || PRIVATE_STATE_PASSWORD.length < 16) {
  throw new Error('PRIVATE_STATE_PASSWORD must be at least 16 characters');
}

// 3. Build each provider individually so they can be reused or replaced.

/** Retrieves ZK circuit artifacts (WASM, keys) from a remote URL. */
const zkConfigProvider = new FetchZkConfigProvider(ZK_CONFIG_BASE_URL);

/**
 * Stores and retrieves private state encrypted on the local filesystem.
 * AES-256-GCM with PBKDF2-SHA256 (600 000 iterations).
 */
const privateStateProvider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
  accountId: 'example-account',
});

/**
 * Queries the Midnight Indexer for public on-chain data.
 * Requires both an HTTP endpoint (queries) and a WebSocket endpoint
 * (subscriptions).
 */
const publicDataProvider = indexerPublicDataProvider(
  INDEXER_HTTP_URL,
  INDEXER_WS_URL,
);

/**
 * Sends circuit inputs to the proof server and receives ZK proofs back.
 * Pass the same zkConfigProvider so it can fetch the proving key.
 */
const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);

// 4. Combine into the providers bag.
//    walletProvider and midnightProvider come from @midnight-ntwrk/wallet-sdk
//    and depend on the connected wallet extension — omitted here for brevity.
const providers = {
  privateStateProvider,
  publicDataProvider,
  zkConfigProvider,
  proofProvider,
  // walletProvider,    // from @midnight-ntwrk/wallet-sdk
  // midnightProvider,  // from @midnight-ntwrk/wallet-sdk
} satisfies Partial<MidnightProviders<never, never, never, never>>;

console.log('Providers assembled:', Object.keys(providers).join(', '));
