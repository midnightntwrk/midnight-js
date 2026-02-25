# New Features v3.1.0

## 1. Private State Import/Export (#435)

Backup and restore encrypted private state data with new `exportPrivateStates()` and `importPrivateStates()` methods.

### TypeScript Signatures
```typescript
interface PrivateStateProvider {
  exportPrivateStates(options?: ExportOptions): Promise<EncryptedExport>;
  importPrivateStates(data: EncryptedExport, options?: ImportOptions): Promise<ImportResult>;
}

interface ExportOptions {
  password?: string;  // Custom password (min 16 chars), defaults to storage password
}

interface ImportOptions {
  password?: string;           // Password used during export
  onConflict?: 'skip' | 'overwrite' | 'error';  // Conflict resolution strategy
  maxStates?: number;          // Max states to import (default: 10000)
}

interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
}
```

### Usage
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({ walletProvider });

// Export all private states with default storage password
const exportData = await provider.exportPrivateStates();

// Export with custom password
const exportDataCustom = await provider.exportPrivateStates({
  password: 'my-secure-export-password-16chars'
});

// Import with skip strategy (keep existing states)
const result = await provider.importPrivateStates(exportData, {
  onConflict: 'skip'
});
console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}`);

// Import with overwrite strategy
const resultOverwrite = await provider.importPrivateStates(exportData, {
  onConflict: 'overwrite'
});
console.log(`Imported: ${resultOverwrite.imported}, Overwritten: ${resultOverwrite.overwritten}`);

// Import with error strategy (fails if any conflict)
try {
  await provider.importPrivateStates(exportData, {
    onConflict: 'error'
  });
} catch (error) {
  console.error('Import failed due to conflict');
}
```

### Security Features
- **AES-256-GCM encryption** - All exported data is encrypted
- **Password validation** - Custom passwords must be at least 16 characters
- **Versioned format** - Export format includes version for forward compatibility
- **Memory protection** - Configurable `maxStates` limit (default 10000) prevents memory exhaustion attacks
- **Salt validation** - 32-byte salts (64 hex chars) are validated on import
- **Single error type** - `ExportDecryptionError` prevents oracle attacks by not distinguishing between wrong password and corrupted data

### Export Format
```typescript
interface EncryptedExport {
  format: 'midnight-private-state-export';
  version: number;
  salt: string;        // 64 hex characters (32 bytes)
  iv: string;          // Initialization vector
  encrypted: string;   // AES-256-GCM encrypted payload
  tag: string;         // Authentication tag
}
```

### Benefits
- Backup private state before migrations
- Transfer private state between environments
- Disaster recovery
- Secure sharing of private state between trusted parties

---

## 2. Contract Address Scoping for Private State (#470)

Private state operations are now automatically scoped by contract address, providing namespace isolation across contracts.

### TypeScript Signature
```typescript
interface PrivateStateProvider {
  setContractAddress(address: ContractAddress): void;
}
```

### Automatic Scoping

The `setContractAddress` method is called automatically in the following operations:

#### Contract Deployment
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});
// setContractAddress is called automatically with the new contract address
```

#### Contract Discovery
```typescript
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

const found = await findDeployedContract(providers, {
  compiledContract: MyContract,
  contractAddress: existingAddress,
  privateStateId: 'myState'
});
// setContractAddress is called automatically with the existing contract address
```

#### Call Transactions
```typescript
// When calling via deployed contract interface
const result = await deployed.callTx.increment();
// setContractAddress is called automatically before each call

// When using submitCallTx directly
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

await submitCallTx(providers, {
  contractAddress,
  circuit: 'increment',
  // ...
});
// setContractAddress is called automatically
```

### Manual Scoping

For advanced use cases, you can manually set the contract address:

```typescript
const provider = levelPrivateStateProvider({ walletProvider });

// Manually scope to a specific contract
provider.setContractAddress(contractAddress);

// All subsequent operations are scoped to this contract
await provider.set('key', value);
const data = await provider.get('key');
```

### Benefits
- **Namespace isolation** - Private states from different contracts are isolated
- **Automatic management** - No manual intervention needed for standard workflows
- **Consistency** - Ensures private state operations always target the correct contract
- **Security** - Prevents accidental cross-contract state access

---

## Feature Comparison Matrix

| Feature | v3.0.0 | v3.1.0 |
|---------|--------|--------|
| Private State Export | - | exportPrivateStates() |
| Private State Import | - | importPrivateStates() |
| Contract Address Scoping | - | setContractAddress() |
| Automatic Scoping in deployContract | - | Automatic |
| Automatic Scoping in findDeployedContract | - | Automatic |
| Automatic Scoping in submitCallTx | - | Automatic |
