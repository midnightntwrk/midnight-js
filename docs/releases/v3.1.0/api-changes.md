# API Changes Reference v3.1.0

## Package: @midnight-ntwrk/midnight-js-level-private-state-provider

### Deprecation Notice

This package is now **deprecated** and marked as **NOT FOR COMMERCIAL USE**.

**WARNING:** This package uses browser localStorage or Node.js file storage - losing private state by clearing browser cache could be financially ruinous.

### Added Exports

#### exportPrivateStates

```typescript
async function exportPrivateStates(options?: ExportOptions): Promise<EncryptedExport>;

interface ExportOptions {
  password?: string;  // Custom password (min 16 chars)
}

interface EncryptedExport {
  format: 'midnight-private-state-export';
  version: number;
  salt: string;
  iv: string;
  encrypted: string;
  tag: string;
}
```

**Usage:**
```typescript
// With default storage password
const backup = await provider.exportPrivateStates();

// With custom password
const backup = await provider.exportPrivateStates({
  password: 'custom-password-16-chars'
});
```

#### importPrivateStates

```typescript
async function importPrivateStates(
  data: EncryptedExport,
  options?: ImportOptions
): Promise<ImportResult>;

interface ImportOptions {
  password?: string;
  onConflict?: 'skip' | 'overwrite' | 'error';
  maxStates?: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
}
```

**Usage:**
```typescript
const result = await provider.importPrivateStates(backup, {
  onConflict: 'skip',
  maxStates: 10000
});
```

#### setContractAddress

```typescript
function setContractAddress(address: ContractAddress): void;
```

**Usage:**
```typescript
provider.setContractAddress(contractAddress);
```

---

## Package: @midnight-ntwrk/midnight-js-types

### Added Exports

#### PrivateStateProvider Interface Extensions

```typescript
interface PrivateStateProvider {
  // Existing methods...

  // New in v3.1.0
  exportPrivateStates(options?: ExportOptions): Promise<EncryptedExport>;
  importPrivateStates(data: EncryptedExport, options?: ImportOptions): Promise<ImportResult>;
  setContractAddress(address: ContractAddress): void;
}
```

---

## Package: @midnight-ntwrk/midnight-js-contracts

### Modified Behavior

#### deployContract

Now automatically calls `setContractAddress` on the private state provider after deployment.

```typescript
// Internal behavior change - no API change
const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});
// setContractAddress(deployedAddress) is called automatically
```

#### findDeployedContract

Now automatically calls `setContractAddress` on the private state provider.

```typescript
// Internal behavior change - no API change
const found = await findDeployedContract(providers, {
  compiledContract: MyContract,
  contractAddress: existingAddress,
  privateStateId: 'myState'
});
// setContractAddress(existingAddress) is called automatically
```

#### submitCallTx

Now automatically calls `setContractAddress` before executing the call.

```typescript
// Internal behavior change - no API change
await submitCallTx(providers, {
  contractAddress,
  circuit: 'myCircuit',
  // ...
});
// setContractAddress(contractAddress) is called automatically
```

### Bug Fixes

#### CircuitCallTxInterface (#497)

Fixed `TransactionContext` being incorrectly included in circuit call arguments.

**v3.0.0:**
```typescript
// TransactionContext was incorrectly passed to circuit
type CircuitCallArgs<C, K> = [...CircuitArgs<C, K>, TransactionContext]; // Bug
```

**v3.1.0:**
```typescript
// TransactionContext is now correctly excluded
type CircuitCallArgs<C, K> = CircuitArgs<C, K>; // Fixed
```

---

## Type Changes Summary

### New Types

| Type | Package | Purpose |
|------|---------|---------|
| `ExportOptions` | midnight-js-level-private-state-provider | Options for exportPrivateStates |
| `ImportOptions` | midnight-js-level-private-state-provider | Options for importPrivateStates |
| `ImportResult` | midnight-js-level-private-state-provider | Result of importPrivateStates |
| `EncryptedExport` | midnight-js-level-private-state-provider | Encrypted export data structure |

### Modified Types

| Type | Change | Impact |
|------|--------|--------|
| `PrivateStateProvider` | Added 3 new methods | Extends interface |
| `CircuitCallTxInterface` | Removed TransactionContext from args | Bug fix |

---

## Complete API Diff

### @midnight-ntwrk/midnight-js-level-private-state-provider

```diff
+ // Package is now deprecated - NOT FOR COMMERCIAL USE

  interface PrivateStateProvider {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
+   exportPrivateStates(options?: ExportOptions): Promise<EncryptedExport>;
+   importPrivateStates(data: EncryptedExport, options?: ImportOptions): Promise<ImportResult>;
+   setContractAddress(address: ContractAddress): void;
  }

+ interface ExportOptions {
+   password?: string;
+ }

+ interface ImportOptions {
+   password?: string;
+   onConflict?: 'skip' | 'overwrite' | 'error';
+   maxStates?: number;
+ }

+ interface ImportResult {
+   imported: number;
+   skipped: number;
+   overwritten: number;
+ }

+ interface EncryptedExport {
+   format: 'midnight-private-state-export';
+   version: number;
+   salt: string;
+   iv: string;
+   encrypted: string;
+   tag: string;
+ }
```

### @midnight-ntwrk/midnight-js-contracts

```diff
  // tx-interfaces.ts
- type CircuitCallArgs<C, K> = [...CircuitArgs<C, K>, TransactionContext];
+ type CircuitCallArgs<C, K> = CircuitArgs<C, K>;
```
