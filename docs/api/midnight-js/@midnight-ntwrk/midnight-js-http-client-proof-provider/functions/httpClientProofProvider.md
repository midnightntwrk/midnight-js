[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-http-client-proof-provider](../README.md) / httpClientProofProvider

# Function: httpClientProofProvider()

HTTP Client Proof Provider

This package provides two levels of abstraction for interacting with a Midnight proof server:

## High-Level: Transaction Proving (ProofProvider)
Use `httpClientProofProvider` for most use cases. It handles complete transactions
by using the low-level ProvingProvider internally.

```typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);
const provenTx = await proofProvider.proveTx(unprovenTx, { zkConfig });
```

## Low-Level: Circuit Proving (ProvingProvider)
Use `httpClientProvingProvider` for advanced scenarios where you need fine-grained
control over individual circuit proving operations.

```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const provingProvider = httpClientProvingProvider(
  'http://localhost:6300',
  zkConfigProvider
);
const checkResult = await provingProvider.check(serializedPreimage, circuitId);
const proof = await provingProvider.prove(serializedPreimage, circuitId);
```

## Architecture
```
ProofProvider (httpClientProofProvider)
    ↓ uses
ProvingProvider (httpClientProvingProvider)
    ↓ calls
Proof Server (/check, /prove)
```

## Call Signature

> **httpClientProofProvider**\<`K`\>(`options`): [`ProofProvider`](#)

Creates a high-level [ProofProvider](#) that implements transaction-level proving
using the low-level circuit-by-circuit [ProvingProvider](#) as its foundation.

This adapter bridges the gap between:
- High-level ProofProvider interface (works with complete transactions)
- Low-level ProvingProvider interface (works with individual circuits)

### Type Parameters

#### K

`K` *extends* `string`

### Parameters

#### options

`HttpClientProofProviderOptions`\<`K`\>

Connection and proving configuration — see HttpClientProofProviderOptions

### Returns

[`ProofProvider`](#)

A ProofProvider instance that uses ProvingProvider internally

### Remarks

**Architecture:**
```
ProofProvider (Transaction-level)
    ↓ (adapter)
ProvingProvider (Circuit-level)
    ↓ (HTTP client)
Proof Server (/check, /prove endpoints)
```

**Note:** The /prove-tx endpoint is NOT used. All proving is done through
individual circuit operations using /check and /prove endpoints.

## Call Signature

> **httpClientProofProvider**\<`K`\>(`url`, `zkConfigProvider`, `config?`): [`ProofProvider`](#)

### Type Parameters

#### K

`K` *extends* `string`

### Parameters

#### url

`string`

The URL of the proof server

#### zkConfigProvider

`ZKConfigRegistry` \| [`ZKConfigProvider`](#)\<`K`\>

Provider for zero-knowledge configuration artifacts

#### config?

[`ProvingProviderConfig`](../interfaces/ProvingProviderConfig.md)

Optional configuration for the underlying ProvingProvider

### Returns

[`ProofProvider`](#)

A ProofProvider instance that uses ProvingProvider internally

### Deprecated

Use the HttpClientProofProviderOptions object form:
`httpClientProofProvider({ url, zkConfigProvider })`.
