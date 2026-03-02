# Contracts

Utilities for deploying and interacting with Midnight smart contracts.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-contracts
```

## Quick Start

```typescript
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// Deploy a new contract
const deployed = await deployContract(providers, {
  compiledContract: myContract,
  privateStateId: 'my-state',
  initialPrivateState: { counter: 0n }
});

// Call a circuit on the deployed contract
const result = await deployed.callTx.myCircuit({ arg: 'value' });

// Find an existing deployed contract
const found = await findDeployedContract(providers, {
  compiledContract: myContract,
  contractAddress: '0x...',
  privateStateId: 'my-state'
});
```

## API

### deployContract

Creates and submits a contract deployment transaction.

```typescript
const deployed = await deployContract(providers, {
  compiledContract,          // Compiled Compact contract
  privateStateId,            // ID for storing private state (optional for stateless contracts)
  initialPrivateState,       // Initial private state (optional for stateless contracts)
  signingKey                 // Contract maintenance authority key (optional, auto-generated if omitted)
});
```

Returns a `DeployedContract` with:
- `deployTxData` - Deployment transaction data
- `callTx` - Interface for calling contract circuits
- `circuitMaintenanceTx` - Interface for circuit maintenance operations
- `contractMaintenanceTx` - Interface for contract maintenance operations

### findDeployedContract

Finds an existing deployed contract by address.

```typescript
const found = await findDeployedContract(providers, {
  compiledContract,          // Compiled Compact contract
  contractAddress,           // Address of deployed contract
  privateStateId,            // ID for retrieving/storing private state (optional)
  initialPrivateState,       // Private state to store (optional, uses existing if omitted)
  signingKey                 // Maintenance authority key (optional, auto-generated if needed)
});
```

### Transaction Submission

```typescript
import { submitCallTx, submitDeployTx, submitTx } from '@midnight-ntwrk/midnight-js-contracts';

// Submit a call transaction
await submitCallTx(providers, callOptions);

// Submit a deploy transaction
await submitDeployTx(providers, deployOptions);

// Generic transaction submission
await submitTx(providers, txData);
```

### Maintenance Operations

```typescript
import {
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';

// Insert a verifier key for a circuit
await submitInsertVerifierKeyTx(providers, options);

// Remove a verifier key
await submitRemoveVerifierKeyTx(providers, options);

// Replace contract maintenance authority
await submitReplaceAuthorityTx(providers, options);
```

### State Queries

```typescript
import { getStates, getPublicStates, getUnshieldedBalances } from '@midnight-ntwrk/midnight-js-contracts';

// Get contract states (public + private)
const states = await getStates(providers, contractAddress, privateStateId);

// Get public states only
const publicStates = await getPublicStates(providers, contractAddress);

// Get unshielded token balances
const balances = await getUnshieldedBalances(providers, contractAddress);
```

### Transaction Interfaces

```typescript
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createContractMaintenanceTxInterface
} from '@midnight-ntwrk/midnight-js-contracts';
```

### Utility Functions

```typescript
import { verifierKeysEqual, verifyContractState } from '@midnight-ntwrk/midnight-js-contracts';

// Compare verifier keys
const equal = verifierKeysEqual(keyA, keyB);

// Verify contract state matches expected verifier keys
verifyContractState(verifierKeys, contractState);
```

## Providers

Contract operations require a `ContractProviders` object (alias for `MidnightProviders`):

```typescript
type ContractProviders = {
  privateStateProvider: PrivateStateProvider;  // Private state storage
  publicDataProvider: PublicDataProvider;      // Blockchain data queries
  zkConfigProvider: ZKConfigProvider;          // ZK proving configuration
  proofProvider: ProofProvider;                // ZK proof generation
  walletProvider: WalletProvider;              // Transaction balancing
  midnightProvider: MidnightProvider;          // Transaction submission
  loggerProvider?: LoggerProvider;             // Optional logging
};
```

## Exports

```typescript
import {
  // Deployment
  deployContract,
  DeployContractOptions,
  DeployedContract,

  // Finding contracts
  findDeployedContract,
  FindDeployedContractOptions,
  FoundContract,

  // Transaction submission
  submitCallTx,
  submitDeployTx,
  submitTx,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx,

  // State queries
  getStates,
  getPublicStates,
  getUnshieldedBalances,

  // Transaction interfaces
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createContractMaintenanceTxInterface,
  CircuitCallTxInterface,
  CircuitMaintenanceTxInterface,
  ContractMaintenanceTxInterface,

  // Utilities
  verifierKeysEqual,
  verifyContractState,

  // Types
  ContractProviders,
  CallOptions,
  CallResult,
  FinalizedDeployTxData,
  UnsubmittedCallTxData,
  UnsubmittedDeployTxData,

  // Errors
  CallTxFailedError,
  DeployTxFailedError,
  ContractTypeError,
  TxFailedError
} from '@midnight-ntwrk/midnight-js-contracts';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
