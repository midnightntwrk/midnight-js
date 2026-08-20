# HTTP Client Proof Provider

HTTP client for interacting with Midnight proof servers to generate zero-knowledge proofs.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-http-client-proof-provider
```

## Quick Start

```typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);

// Transaction payloads cross a provider seam version-tagged: tag on the way
// in, narrow on `version` on the way out. There is no untagged form.
const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
if (proven.version !== 'v9') {
  throw new Error('Expected a v9 proven transaction');
}
const provenTx = proven.tx;
```

## Configuration

| Option             | Required | Default  | Description                                    |
| ------------------ | -------- | -------- | ---------------------------------------------- |
| `url`              | ✓        | -        | Proof server URL (http/https only)             |
| `zkConfigProvider` | ✓        | -        | Provider for ZK configuration artifacts        |
| `timeout`          |          | `300000` | Request timeout in milliseconds (5 minutes)    |

## Architecture

This package provides two abstraction levels for proof generation:

```
ProofProvider (httpClientProofProvider) - Transaction-level
    ↓ uses internally
ProvingProvider (httpClientProvingProvider) - Circuit-level
    ↓ HTTP requests
Proof Server (/check, /prove endpoints)
```

### High-Level: Transaction Proving

Use `httpClientProofProvider` for most use cases. It handles complete transactions by orchestrating individual circuit proofs internally.

```typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);

const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
if (proven.version !== 'v9') {
  throw new Error('Expected a v9 proven transaction');
}
const provenTx = proven.tx;
```

### Low-Level: Circuit Proving

Use `httpClientProvingProvider` for advanced scenarios requiring fine-grained control over individual circuit proving operations.

```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const provingProvider = httpClientProvingProvider(
  'http://localhost:6300',
  zkConfigProvider
);

const checkResult = await provingProvider.check(serializedPreimage, circuitId);
const proof = await provingProvider.prove(serializedPreimage, circuitId);
```

## API

### ProofProvider (High-Level)

```typescript
proveTx(
  unprovenTx: VersionedUnprovenTransaction,
  proveTxConfig?: ProveTxConfig
): Promise<VersionedUnboundTransaction>
```

Proves all circuits in a transaction and returns the proven transaction.

Both the argument and the result are version-tagged unions: the `'v9'` arm
carries the live ledger object as `tx`, the `'v8'` arm carries serialized
bytes as `txBytes`. Narrow on `version` before touching the payload. This
provider serves the `'v9'` arm; a `'v8'` payload is rejected.

### ProvingProvider (Low-Level)

```typescript
check(serializedPreimage: Uint8Array, keyLocation: string): Promise<(bigint | undefined)[]>
```

Validates circuit inputs before proof generation.

```typescript
prove(serializedPreimage: Uint8Array, keyLocation: string, overwriteBindingInput?: bigint): Promise<Uint8Array>
```

Generates a zero-knowledge proof for a circuit.

## URL Configuration

The provider supports complex URL configurations including path prefixes and query parameters.

### Path Prefix

```typescript
const proofProvider = httpClientProofProvider(
  'http://localhost:6300/api/v1',
  zkConfigProvider
);
// Endpoints: /api/v1/check, /api/v1/prove
```

### Query Parameters

```typescript
const proofProvider = httpClientProofProvider(
  'http://localhost:6300?token=your-api-key',
  zkConfigProvider
);
// Endpoints: /check?token=your-api-key, /prove?token=your-api-key
```

### Combined Path and Query

```typescript
const proofProvider = httpClientProofProvider(
  'http://localhost:6300/api/v1?token=your-api-key&env=production',
  zkConfigProvider
);
// Endpoints: /api/v1/check?token=your-api-key&env=production
```

### URL Behavior

| Base URL                          | /check Endpoint                         | /prove Endpoint                         |
| --------------------------------- | --------------------------------------- | --------------------------------------- |
| `http://localhost:6300`           | `/check`                                | `/prove`                                |
| `http://localhost:6300/`          | `/check`                                | `/prove`                                |
| `http://localhost:6300/api/v1`    | `/api/v1/check`                         | `/api/v1/prove`                         |
| `http://localhost:6300/api/v1/`   | `/api/v1/check`                         | `/api/v1/prove`                         |
| `http://localhost:6300?token=abc` | `/check?token=abc`                      | `/prove?token=abc`                      |

## Timeout Configuration

```typescript
const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider,
  { timeout: 60000 } // 60 seconds
);
```

## Retry Behavior

The provider automatically retries failed requests with exponential backoff:

| Attempt | Delay    | Retried Status Codes |
| ------- | -------- | -------------------- |
| 1       | 1 second | 500, 503             |
| 2       | 2 seconds| 500, 503             |
| 3       | 4 seconds| 500, 503             |

## Error Handling

### Invalid Protocol

Only `http:` and `https:` protocols are supported.

```typescript
// Throws InvalidProtocolSchemeError
httpClientProofProvider('ws://localhost:6300', zkConfigProvider);
```

### Server Errors

HTTP errors throw with details about the failed request:

```
Failed Proof Server response: url="http://localhost:6300/prove", code="500", status="Internal Server Error"
```

## Exports

```typescript
import {
  // High-level: Transaction proving
  httpClientProofProvider,
  DEFAULT_CONFIG,

  // Low-level: Circuit proving
  httpClientProvingProvider,
  DEFAULT_TIMEOUT,
  type ProvingProviderConfig
} from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
```

## Detailed

### Server Endpoints

| Endpoint | Method | Description                        |
| -------- | ------ | ---------------------------------- |
| `/check` | POST   | Validate circuit inputs            |
| `/prove` | POST   | Generate zero-knowledge proof      |

### Default Values

| Constant          | Value    | Description              |
| ----------------- | -------- | ------------------------ |
| `DEFAULT_TIMEOUT` | `300000` | 5 minutes in ms          |

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   httpClientProofProvider                        │
│                                                                  │
│  ┌──────────────────┐                                            │
│  │ proveTx()        │                                            │
│  │ (transaction)    │                                            │
│  └────────┬─────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐        │
│  │            httpClientProvingProvider                  │        │
│  │                                                       │        │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │        │
│  │  │ ZKConfig    │───►│ check()     │───►│ /check   │  │        │
│  │  │ Provider    │    │ prove()     │───►│ /prove   │  │        │
│  │  └─────────────┘    └─────────────┘    └──────────┘  │        │
│  │                           │                  │        │        │
│  │                           ▼                  ▼        │        │
│  │                    ┌─────────────────────────────┐    │        │
│  │                    │ Retry Logic (3 attempts)    │    │        │
│  │                    │ Exponential backoff         │    │        │
│  │                    └─────────────────────────────┘    │        │
│  └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
