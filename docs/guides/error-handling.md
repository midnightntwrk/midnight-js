# Error Handling in Midnight.js

Midnight.js uses a robust, typed error handling model. Because the framework orchestrates complex interactions across multiple providers—including local state management, network queries, zero-knowledge proofs, and blockchain transactions—errors are categorized into specific classes. This allows developers to catch specific issues and provide actionable feedback to users.

This guide explains the primary error types and provides best practices for handling them.

## Best Practices

### Use `instanceof` for Type-Safe Error Handling

Always use custom error classes with `instanceof` checks rather than string matching against error messages. This ensures your application remains robust even if error messages change in future framework versions.

```typescript
import { 
  DeployTxFailedError, 
  CallTxFailedError, 
  ContractTypeError 
} from '@midnight-ntwrk/midnight-js-contracts';
import { ExportDecryptionError } from '@midnight-ntwrk/midnight-js-types';

try {
  // Midnight.js operation
} catch (error) {
  if (error instanceof DeployTxFailedError) {
    console.error('Failed to deploy contract:', error.finalizedTxData);
    // Handle deployment failure (e.g., notify user)
  } else if (error instanceof CallTxFailedError) {
    console.error(`Circuit call failed: ${error.circuitId}`);
    // Handle circuit execution failure
  } else if (error instanceof ExportDecryptionError) {
    console.error('Invalid password or corrupted export data');
    // Prompt user to try again
  } else {
    // Handle unknown errors
    throw error;
  }
}
```

### Preserve Error Chains

When catching and re-throwing errors, or wrapping them in your application's domain errors, always preserve the original error as the `cause`. This ensures you don't lose valuable stack traces or diagnostic information.

```typescript
class MyDappError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'MyDappError';
  }
}

try {
  await interactWithContract();
} catch (error) {
  throw new MyDappError('Contract interaction failed', error instanceof Error ? error : undefined);
}
```

---

## Common Error Categories

### 1. Transaction Errors

Thrown by `@midnight-ntwrk/midnight-js-contracts` when operations fail during transaction submission or finalization.

- **`TxFailedError`**: Base class for transaction failures. Contains a `finalizedTxData` property which holds the transaction result.
- **`DeployTxFailedError`**: Thrown when a deploy transaction is not successfully applied by the consensus node.
- **`CallTxFailedError`**: Thrown when a call transaction fails. Includes the `circuitId` that was called.

**Troubleshooting:**
These errors usually mean that while the transaction was successfully built and balanced, the network ultimately rejected it (e.g., due to state conflicts, validation failures, or incorrect witness data). Inspect the `finalizedTxData` for details.

### 2. Contract Discovery and Identity Errors

- **`ContractTypeError`**: Thrown when there is a mismatch between the provided contract type and the actual contract deployed at a specific address (e.g., verifier keys don't match).
- **`ScopedTransactionIdentityMismatchError`**: Thrown when attempting to use cached states with a different contract address or private state ID than originally cached.
- **`IncompleteCallTxPrivateStateConfig`**: Thrown when a private state ID is defined for a call, but no `privateStateProvider` is configured.
- **`IncompleteFindContractPrivateStateConfig`**: Thrown when an initial private state is defined, but no `privateStateId` is configured.

### 3. Private State Management Errors

Thrown by `@midnight-ntwrk/midnight-js-types` (often surfaced by the `LevelPrivateStateProvider`) when managing local encrypted state.

- **`PrivateStateImportError`**: Base class for import failures.
- **`ExportDecryptionError`**: Thrown when decryption of export data fails (e.g., wrong password, corrupted data).
- **`InvalidExportFormatError`**: Thrown when imported data does not conform to the expected format.
- **`ImportConflictError`**: Thrown when importing private states conflicts with existing data, and the conflict strategy is set to throw an error.
- **`PrivateStateExportError`** / **`SigningKeyExportError`**: Thrown when exporting states or keys fails.

### 4. Indexer and Data Provider Errors

Thrown by `@midnight-ntwrk/midnight-js-indexer-public-data-provider`.

- **`IndexerError`**: Base abstract class for indexer errors.
- **`IndexerQueryError`**: Thrown when a GraphQL query to the indexer fails.
- **`IndexerDataError`**: Thrown when the indexer returns unexpected or malformed data.
- **`WatchTimeoutError`**: Thrown when a polling query to a data provider exceeds the maximum configured wait time.

---

## Handling Contract Errors Gracefully

When interacting with smart contracts, users may encounter circuit failures. The `CallTxFailedError` provides insights into which circuit failed.

```typescript
import { CallTxFailedError } from '@midnight-ntwrk/midnight-js-contracts';

async function performAction() {
  try {
    const tx = await contract.callTx.performAction();
    return tx;
  } catch (error) {
    if (error instanceof CallTxFailedError) {
      if (error.circuitId === 'performAction') {
        // Provide user-friendly feedback based on the circuit that failed
        alert('Action could not be completed. Please check your inputs and try again.');
      }
    }
    throw error;
  }
}
```

## Security Considerations

When handling errors, especially `ExportDecryptionError` or other private state errors, do not log sensitive data (such as passwords, keys, or raw private state) to the console or telemetry systems. Use the custom error types to understand the *kind* of failure without needing to inspect sensitive payloads.
