# Midnight.js

[![CI](https://github.com/midnightntwrk/midnight-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/midnightntwrk/midnight-js/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![GitHub Release](https://img.shields.io/github/v/release/midnightntwrk/midnight-js?logo=github)](https://github.com/midnightntwrk/midnight-js/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/midnightntwrk/midnight-js/pulls)

TypeScript application development framework for the Midnight blockchain. Similar to [Web3.js](https://web3js.org/) for Ethereum or [polkadot.js](https://polkadot.js.org/) for Polkadot.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-contracts @midnight-ntwrk/midnight-js-types
```

## Quick Start

```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Set network
setNetworkId('testnet');

// Configure providers
const providers = {
  privateStateProvider: levelPrivateStateProvider({
    privateStoragePasswordProvider: () => 'your-secure-password',
    accountId: 'user-wallet-address'
  }),
  publicDataProvider: indexerPublicDataProvider(
    'https://indexer.example.com/graphql',
    'wss://indexer.example.com/graphql'
  ),
  // ... zkConfigProvider, proofProvider, walletProvider, midnightProvider
};

// Deploy a contract
const deployed = await deployContract(providers, {
  compiledContract: myContract,
  privateStateId: 'my-state',
  initialPrivateState: { counter: 0n }
});

// Call a circuit
const result = await deployed.callTx.increment();
```

## Features

### Standard Blockchain Operations

- Creating and submitting transactions
- Interacting with wallets
- Querying block and contract state
- Subscribing to chain events

### Privacy-Preserving Utilities

- Executing smart contracts locally
- Incorporating private state into contract execution
- Persisting, querying, and updating private state
- Creating and verifying zero-knowledge proofs

## Packages

| Package | Description |
| ------- | ----------- |
| [@midnight-ntwrk/midnight-js](packages/midnight-js) | Barrel package for Midnight.js core framework |
| [@midnight-ntwrk/midnight-js-types](packages/types) | Shared types, interfaces, and provider contracts |
| [@midnight-ntwrk/midnight-js-contracts](packages/contracts) | Contract deployment and interaction utilities |
| [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](packages/dapp-connector-proof-provider) | Proof provider delegating to DApp Connector wallet |
| [@midnight-ntwrk/midnight-js-indexer-public-data-provider](packages/indexer-public-data-provider) | GraphQL-based blockchain data provider |
| [@midnight-ntwrk/midnight-js-level-private-state-provider](packages/level-private-state-provider) | Encrypted LevelDB private state storage |
| [@midnight-ntwrk/midnight-js-http-client-proof-provider](packages/http-client-proof-provider) | HTTP client for proof server |
| [@midnight-ntwrk/midnight-js-fetch-zk-config-provider](packages/fetch-zk-config-provider) | Browser-based ZK artifact retrieval |
| [@midnight-ntwrk/midnight-js-node-zk-config-provider](packages/node-zk-config-provider) | Node.js filesystem-based ZK artifact retrieval |
| [@midnight-ntwrk/midnight-js-network-id](packages/network-id) | Network identifier management |
| [@midnight-ntwrk/midnight-js-logger-provider](packages/logger-provider) | Pino logger wrapper for diagnostics |
| [@midnight-ntwrk/midnight-js-compact](packages/compact) | Compact compiler manager |
| [@midnight-ntwrk/midnight-js-utils](packages/utils) | General utility functions |

## Architecture

### Deployment Diagram

![](./docs/image/deployment-diagram.png)

| Element | Package |
| ------- | ------- |
| Contracts | @midnight-ntwrk/midnight-js-contracts |
| PublicDataProvider | @midnight-ntwrk/midnight-js-indexer-public-data-provider |
| PrivateStateProvider | @midnight-ntwrk/midnight-js-level-private-state-provider |
| ProofProvider | @midnight-ntwrk/midnight-js-http-client-proof-provider or @midnight-ntwrk/midnight-js-dapp-connector-proof-provider |
| ZKConfigProvider | @midnight-ntwrk/midnight-js-fetch-zk-config-provider |
| DappConnector | @midnight-ntwrk/dapp-connector-api |
| Wallet | @midnight-ntwrk/wallet |
| Ledger | @midnight-ntwrk/ledger |
| Compact Runtime | @midnight-ntwrk/compact-runtime |
| Impact VM | @midnight-ntwrk/onchain-runtime |

### Transaction Flow

![](./docs/image/call-tx-build-sequence-diagram.png)

## Providers

Midnight.js uses a provider pattern for modularity. Each provider implements an interface from `@midnight-ntwrk/midnight-js-types`:

```typescript
interface MidnightProviders {
  privateStateProvider: PrivateStateProvider;  // Private state storage
  publicDataProvider: PublicDataProvider;      // Blockchain queries
  zkConfigProvider: ZKConfigProvider;          // ZK artifact retrieval
  proofProvider: ProofProvider;                // ZK proof generation
  walletProvider: WalletProvider;              // Transaction balancing
  midnightProvider: MidnightProvider;          // Transaction submission
  loggerProvider?: LoggerProvider;             // Optional logging
}
```

## Contracts

Compiling a Compact smart contract with `compactc` produces a JavaScript file (circuit execution logic) and a TypeScript declaration file (type definitions). Midnight.js uses these to execute circuits locally and create type-safe transactions. See [Contract Compilation Details](#contract-compilation-details) for more.

## Security

The `LevelPrivateStateProvider` encrypts all private state data at rest using:

| Parameter | Value |
| --------- | ----- |
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 600,000 |
| Password Minimum | 16 characters |

## Development

### Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) - Node.js version management
- [direnv](https://direnv.net) (optional) - Automatically sets `COMPACTC_VERSION`, activates Node via nvm, and configures GPG signing

### Setup

```bash
# If using direnv (sets environment automatically)
direnv allow

# Install dependencies
yarn install

# Build
yarn build

# Test
yarn test

# Lint
yarn lint:fix
```

### Available Scripts

| Script | Description |
| ------ | ----------- |
| `yarn build` | Build all packages |
| `yarn test` | Run all tests |
| `yarn lint` | Run ESLint |
| `yarn lint:fix` | Fix linting issues |
| `yarn commit` | Interactive conventional commit |
| `yarn changelog` | Generate/update CHANGELOG.md |

### Further Reading

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Detailed guide for working on packages, debugging, and Turborepo commands
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

## Contributing

Branch off `main` for all new features. Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

**Scopes:** `core`, `testkit`, `wallet`, `deps`, `config`

### Git Hooks

- `pre-commit`: Runs lint-staged
- `commit-msg`: Validates commit message format
- `pre-push`: Runs full check suite

## Glossary

| Term | Description |
| ---- | ----------- |
| Witness | Private computation performed on the end user's device |
| Private State | State updated by witnesses, stored on user's device |
| Circuit | Smart contract function that can be executed and proven |
| ZKIR | Zero-Knowledge Intermediate Representation |

## Detailed

### Design Objectives

#### Type-Safety

- Preserves contract circuit argument/return types and user-defined types (`PS`, `Witnesses`) throughout the data model
- Infers types using `infer` instead of introducing additional generic parameters
- Uses least restrictive generic constraints necessary for type safety
- Uses `any` only for truly unconstrained user-supplied types, not to fix compilation issues
- Does not require manual specification of concrete types for generic parameters in most scenarios
- Employs branded types to distinguish domain concepts sharing the same representation (e.g., `HexString` vs `string`)

#### Modularity

- Allows custom implementations of API clients via the "provider" pattern
- Collects commonly used types in `@midnight-ntwrk/midnight-js-types` to standardize across applications

#### Interoperability

- Isomorphic design supporting both browser and Node.js environments
- Supports different Midnight networks (TestNet, MainNet)

#### Reusability

- Builds high-level features from low-level utility functions, exporting both
- Provides default implementation for each API client
- Places each API client in a separate package for selective installation

#### Usability

- Minimizes boilerplate required to set up a dApp
- Supplies common sense defaults to avoid application errors

### Contract Compilation Details

> This section assumes familiarity with the Compact language.

When compiling a Compact smart contract with `compactc`, the **JavaScript file** contains:

- Execution logic for each circuit in the source contract
- Logic for constructing the contract's initial state
- Utilities for converting on-chain contract state into JavaScript representation

The **TypeScript declaration file** contains:

- Type definition for the contract (`Contract`)
- Type definitions for circuits defined within the contract
- Type definition for required witnesses (`Witnesses`)
- Type definition for on-chain state (`Ledger`)

If the Compact source includes `witness` declarations, the `Witnesses` type is a non-empty object with a generic type parameter `PS` representing the private state that witnesses modify during circuit execution.

> The term _runtime_ describes the JS executable for a contract, distinct from `@midnight-ntwrk/compact-runtime` which provides utilities each executable uses.

### Architecture Details

The `Contracts` element contains utilities for creating and submitting transactions. All clients are concrete instances of provider interfaces defined in `@midnight-ntwrk/midnight-js-types`.

Key relationships:
- `Ledger` and `Compact Runtime` both depend on `Impact VM` (on-chain runtime)
- `Midnight.js` and `Substrate Node` both depend on `Ledger`

This allows "rehearsing" circuit calls (running Impact VM) such that execution can be replayed on the node, and creating transactions from rehearsal results that the node accepts.

### Release Process

#### 1. Generate changelog
```bash
yarn changelog  # Updates CHANGELOG.md with new entries
```

#### 2. Update versions
```bash
yarn workspaces foreach --all version $VERSION
```

#### 3. Commit and tag
```bash
git add .
git commit -m "chore: release v$VERSION"
git tag v$VERSION
git push origin v$VERSION  # Triggers CD workflow
```

Use [GitHub Releases](https://github.com/midnightntwrk/midnight-js/releases/new) to create a tag following the pattern `vX.Y.Z`.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
