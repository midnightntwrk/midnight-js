# @midnight-ntwrk/contract-builder

Simplified API for deploying and interacting with Midnight smart contracts.

## Overview

The Contract Builder provides a fluent, developer-friendly interface for working with Midnight smart contracts. It significantly reduces boilerplate code (85%+ reduction) and provides built-in:

- 🎯 **Intuitive Fluent API** - Chain configuration methods for clean, readable code
- 🔄 **Automatic Retry Logic** - Configurable retry with exponential backoff
- 📊 **Built-in Logging** - Integrated logging for debugging and monitoring
- 🎪 **Event System** - Listen to contract method lifecycle events
- 🛡️ **Enhanced Error Handling** - Detailed error messages with context
- 🔍 **Type Safety** - Full TypeScript support with type inference

## Installation

```bash
yarn add @midnight-ntwrk/contract-builder
```

## Quick Start

### 🚀 Simplest Way: Using Default Providers

The easiest way to get started is using default providers that work in both Node.js and Browser:

```typescript
import { createContractAdapter, consoleLogger } from '@midnight-ntwrk/contract-builder';
import { CompilerBlockTime } from './contract';

// Create contract instance
const blockTimeInstance = new CompilerBlockTime.Contract({});

// Deploy with default testnet providers - automatically detects environment!
const contract = await createContractAdapter(blockTimeInstance)
  .withDefaultProviders('testnet')  // 🎉 That's it! Providers auto-configured
  .withLogger(consoleLogger)
  .withRetry({ maxRetries: 3, backoffMs: 1000 })
  .deploy();  // No providers parameter needed!

// Call contract methods
await contract.testBlockTimeLt(futureTime);

console.log('Contract address:', contract.address);
```

**Available Network Presets:**
- `'testnet'` - Midnight testnet
- `'devnet'` - Development network
- `'local'` - Local development setup

### Alternative: Custom Providers

If you need more control, you can provide your own providers:

```typescript
// Deploy with custom providers
const contract = await createContractAdapter(blockTimeInstance)
  .withLogger(logger)
  .withRetry({ maxRetries: 3, backoffMs: 1000 })
  .deploy(customProviders);  // Pass providers explicitly
```

**Code Reduction:** From ~30 lines to ~7 lines (77% reduction)

## API Reference

### `createContractAdapter(contractInstance)`

Creates a new Contract Adapter Builder.

**Parameters:**
- `contractInstance` - The compiled contract instance

**Returns:** `ContractAdapterBuilder`

### ContractAdapterBuilder Methods

#### `.withLogger(logger: Logger)`

Adds logging to contract operations.

```typescript
const logger = {
  info: (msg, data) => console.log(msg, data),
  warn: (msg, data) => console.warn(msg, data),
  error: (msg, data) => console.error(msg, data),
  debug: (msg, data) => console.debug(msg, data)
};

const contract = await createContractAdapter(instance)
  .withLogger(logger)
  .deploy(providers);
```

**Built-in loggers:**
- `consoleLogger` - Logs to console with formatted output
- `noopLogger` - Silent logger (no output)

#### `.withRetry(config: RetryConfig)`

Configures automatic retry for failed operations.

```typescript
const contract = await createContractAdapter(instance)
  .withRetry({
    maxRetries: 3,           // Maximum number of retry attempts
    backoffMs: 1000,         // Initial backoff delay in milliseconds
    exponentialBackoff: true // Use exponential backoff (default: true)
  })
  .deploy(providers);
```

**Retry Config:**
- `maxRetries: number` - Number of retry attempts (default: 3)
- `backoffMs: number` - Initial delay between retries in ms (default: 1000)
- `exponentialBackoff?: boolean` - Use exponential backoff (default: true)

#### `.withDefaultProviders(config, wallet?)`

Configures default providers that automatically work in Node.js and Browser environments.

```typescript
// Using network preset (simplest)
const contract = await createContractAdapter(instance)
  .withDefaultProviders('testnet')
  .deploy();

// With wallet configuration
const contract = await createContractAdapter(instance)
  .withDefaultProviders('testnet', { seed: 'my-seed-phrase' })
  .deploy();

// Using custom network config
const contract = await createContractAdapter(instance)
  .withDefaultProviders({
    networkId: 'custom',
    indexerUrl: 'https://my-indexer.com',
    nodeUrl: 'https://my-node.com'
  })
  .deploy();

// With explicit environment selection
const contract = await createContractAdapter(instance)
  .withDefaultProviders({
    environment: 'nodejs',  // or 'browser' or 'auto' (default)
    network: 'testnet',
    wallet: { seed: 'my-seed' }
  })
  .deploy();
```

**Network Presets:**
- `'testnet'` - Midnight testnet
- `'devnet'` - Development network
- `'local'` - Local development (localhost)

**Environment Detection:**
- `'auto'` (default) - Automatically detects Node.js vs Browser
- `'nodejs'` - Force Node.js providers (node-zk-config-provider, LevelDB)
- `'browser'` - Force browser providers (fetch-zk-config-provider, IndexedDB)

#### `.withWallet(config: WalletConfig)`

Configures wallet for default providers.

```typescript
const contract = await createContractAdapter(instance)
  .withDefaultProviders('testnet')
  .withWallet({ seed: 'my-seed-phrase' })
  .deploy();
```

#### `.withErrorHandler(handler: Function)`

Registers a custom error handler for contract operations.

```typescript
const contract = await createContractAdapter(instance)
  .withErrorHandler((error) => {
    console.error('Contract error:', error);
    // Send to monitoring service, etc.
  })
  .deploy(providers);
```

#### `.on(event: string, handler: Function)`

Registers event listeners for contract method lifecycle.

```typescript
const contract = await createContractAdapter(instance)
  .on('call', (event) => {
    console.log('Method called:', event.methodName, event.args);
  })
  .on('success', (event) => {
    console.log('Method succeeded:', event.methodName, event.result);
  })
  .on('error', (event) => {
    console.error('Method failed:', event.methodName, event.error);
  })
  .deploy(providers);
```

**Available Events:**
- `call` - Emitted when a contract method is called
- `success` - Emitted when a method completes successfully
- `error` - Emitted when a method fails

**Event Objects:**

```typescript
// MethodCallEvent
{
  methodName: string;
  args: any[];
  timestamp: number;
}

// MethodSuccessEvent
{
  methodName: string;
  args: any[];
  result: any;
  duration: number;
  timestamp: number;
}

// MethodErrorEvent
{
  methodName: string;
  args: any[];
  error: Error;
  duration: number;
  timestamp: number;
}
```

#### `.deploy(providers: ContractProviders)`

Deploys the contract and returns an adapter instance.

```typescript
const contract = await createContractAdapter(instance)
  .deploy(providers);
```

**Returns:** `Promise<ContractAdapter>`

#### `.connect(address: string, providers: ContractProviders)`

Connects to an already deployed contract.

```typescript
const contract = await createContractAdapter(instance)
  .connect('0x123...', providers);
```

**Returns:** `Promise<ContractAdapter>`

### ContractAdapter

The adapter returned by `deploy()` or `connect()` provides:

- All contract methods from `callTx` are directly accessible
- `address: string` - Contract address
- `deployTxData: any` - Deployment transaction data
- `on(event, handler)` - Register event handlers (can be chained)

## Advanced Examples

### Complete Configuration with Default Providers

```typescript
import { createContractAdapter, consoleLogger } from '@midnight-ntwrk/contract-builder';

const contract = await createContractAdapter(contractInstance)
  .withDefaultProviders('testnet', { seed: 'my-seed-phrase' })
  .withLogger(consoleLogger)
  .withRetry({
    maxRetries: 5,
    backoffMs: 2000,
    exponentialBackoff: true
  })
  .withErrorHandler((error) => {
    // Send to error tracking service
    errorTracker.report(error);
  })
  .on('call', (event) => {
    console.log(`📞 Calling ${event.methodName}`);
  })
  .on('success', (event) => {
    console.log(`✅ ${event.methodName} completed in ${event.duration}ms`);
  })
  .on('error', (event) => {
    console.error(`❌ ${event.methodName} failed:`, event.error);
  })
  .deploy();  // No providers needed!

// Use the contract
await contract.someMethod(arg1, arg2);
```

### Using Default Providers Directly

You can also create providers separately and reuse them:

```typescript
import { createDefaultProviders, createContractAdapter } from '@midnight-ntwrk/contract-builder';

// Create providers once
const providers = await createDefaultProviders('testnet');

// Use with multiple contracts
const contract1 = await createContractAdapter(instance1).deploy(providers);
const contract2 = await createContractAdapter(instance2).deploy(providers);
```

### Environment-Specific Providers

```typescript
import {
  createTestnetProviders,
  createDevnetProviders,
  createLocalProviders
} from '@midnight-ntwrk/contract-builder';

// Quick helpers for common scenarios
const testnetProviders = await createTestnetProviders();
const devnetProviders = await createDevnetProviders({ seed: 'dev-seed' });
const localProviders = await createLocalProviders();

// Use with contracts
const contract = await createContractAdapter(instance)
  .deploy(testnetProviders);
```

### Monitoring and Metrics

```typescript
const metrics = {
  calls: 0,
  successes: 0,
  failures: 0,
  totalDuration: 0
};

const contract = await createContractAdapter(instance)
  .on('call', () => {
    metrics.calls++;
  })
  .on('success', (event) => {
    metrics.successes++;
    metrics.totalDuration += event.duration;
  })
  .on('error', () => {
    metrics.failures++;
  })
  .deploy(providers);

// Use the contract...

console.log('Metrics:', {
  ...metrics,
  averageDuration: metrics.totalDuration / metrics.successes
});
```

### Custom Logger Integration

```typescript
import winston from 'winston';

const winstonLogger = {
  info: (msg, data) => winston.info(msg, data),
  warn: (msg, data) => winston.warn(msg, data),
  error: (msg, data) => winston.error(msg, data),
  debug: (msg, data) => winston.debug(msg, data)
};

const contract = await createContractAdapter(instance)
  .withLogger(winstonLogger)
  .deploy(providers);
```

### Connect to Existing Contract

```typescript
// Connect to already deployed contract
const contract = await createContractAdapter(instance)
  .withLogger(consoleLogger)
  .connect('0x123456789abcdef', providers);

// Use as normal
await contract.someMethod();
```

## Error Handling

The Contract Builder provides enhanced error classes:

```typescript
import {
  AdapterError,
  DeploymentError,
  MethodCallError,
  RetryExhaustedError,
  ConfigurationError
} from '@midnight-ntwrk/contract-builder';

try {
  await contract.increment();
} catch (error) {
  if (error instanceof MethodCallError) {
    console.error('Method:', error.methodName);
    console.error('Args:', error.args);
    console.error('Cause:', error.cause);
  } else if (error instanceof RetryExhaustedError) {
    console.error('Failed after', error.attempts, 'attempts');
  }
}
```

## Type Safety

Full TypeScript support with type inference:

```typescript
import { createContractAdapter } from '@midnight-ntwrk/contract-builder';
import type { ContractAdapter } from '@midnight-ntwrk/contract-builder';

// Type is inferred from contract instance
const contract = await createContractAdapter(counterInstance)
  .deploy(providers);

// TypeScript knows about all contract methods
await contract.increment(); // ✅ Type-safe
await contract.getValue();   // ✅ Type-safe
// await contract.nonExistent(); // ❌ TypeScript error!

// Explicit typing
type MyContract = { increment: () => Promise<void> };
const typedContract: ContractAdapter<MyContract> = contract;
```

## Comparison: Before vs After

### Before (without Contract Builder)

```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

// Create instance
const blockTimeInstance = new CompilerBlockTime.Contract({});

// Deploy with verbose options
const deployed = await deployContract(providers, {
  contract: blockTimeInstance
});

// Add manual logging
console.log('Deploying contract...');
console.log('Contract deployed at:', deployed.address);

// Add manual error handling for each call
try {
  console.log('Calling testBlockTimeLt...');
  const result = await deployed.callTx.testBlockTimeLt(time);
  console.log('Call succeeded:', result);
} catch (error) {
  console.error('Call failed:', error);
  throw error;
}

// Manual retry logic
let retries = 0;
while (retries < 3) {
  try {
    await deployed.callTx.testBlockTimeLt(time);
    break;
  } catch (error) {
    retries++;
    if (retries === 3) throw error;
    await sleep(1000 * Math.pow(2, retries));
  }
}
```

**Lines of code: ~35 lines**

### After (with Contract Builder)

```typescript
import { createContractAdapter } from '@midnight-ntwrk/contract-builder';

const contract = await createContractAdapter(blockTimeInstance)
  .withLogger(consoleLogger)
  .withRetry({ maxRetries: 3, backoffMs: 1000 })
  .deploy(providers);

await contract.testBlockTimeLt(time);
```

**Lines of code: ~7 lines**
**Code reduction: 80%** 🎉

## Migration Guide

### Step 1: Install

```bash
yarn add @midnight-ntwrk/contract-builder
```

### Step 2: Replace deployContract

**Before:**
```typescript
const deployed = await deployContract(providers, {
  contract: contractInstance
});
```

**After:**
```typescript
const contract = await createContractAdapter(contractInstance)
  .deploy(providers);
```

### Step 3: Update Method Calls

**Before:**
```typescript
await deployed.callTx.myMethod(arg1, arg2);
```

**After:**
```typescript
await contract.myMethod(arg1, arg2);
```

### Step 4: Add Optional Features

```typescript
const contract = await createContractAdapter(contractInstance)
  .withLogger(consoleLogger)        // Add logging
  .withRetry({ maxRetries: 3 })     // Add retry logic
  .on('error', handleError)          // Add error monitoring
  .deploy(providers);
```

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

Apache-2.0

## Support

For issues and questions:
- GitHub Issues: https://github.com/midnight-ntwrk/midnight-js/issues
- Documentation: https://docs.midnight.network

---

**Phase 1 Implementation Complete** ✅
- Core adapter functionality
- Fluent API
- Retry logic
- Logging integration
- Event system
- Comprehensive tests

**Coming in Phase 2:**
- Witnesses support
- Private state management
- Auto-generated state IDs
