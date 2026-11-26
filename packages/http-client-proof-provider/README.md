# HTTP Client Proof Provider

HTTP client for interacting with Midnight proof servers to generate zero-knowledge proofs.

## Installation

```bash
yarn add @midnightntwrk/midnight-js-http-client-proof-provider
```

## Quick Start

```typescript
import { httpClientProofProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';
import { LedgerTransaction } from '@midnightntwrk/midnight-js-types';
import { Transaction } from '@midnightntwrk/ledger-v9';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);

// A transaction is passed to a provider as a handle that carries its era.
// The proven handle comes back in the same era.
const unprovenTx = LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
const provenTx = await proofProvider.proveTx(unprovenTx);
const ledgerProvenTx = provenTx.deserialize({ v9: Transaction });
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
import { httpClientProofProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);

const provenTx = await proofProvider.proveTx(unprovenTx);
```

### Low-Level: Circuit Proving

Use `httpClientProvingProvider` for advanced scenarios requiring fine-grained control over individual circuit proving operations.

```typescript
import { httpClientProvingProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';

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
  unprovenTx: UnprovenTx,
  proveTxConfig?: ProveTxConfig
): Promise<UnboundTx>
```

Proves all circuits in a transaction and returns the proven transaction.

The argument and the result are transaction handles from
`@midnightntwrk/midnight-js-types`. The result has the same era as the
argument. Read the ledger object with your own ledger copy:
`provenTx.deserialize({ v9: Transaction })`. This provider serves both
eras: `supportedEras` is `['v8', 'v9']`.

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

The timeout applies to each HTTP request to the proof server (`/check` or `/prove`), and covers every retry
and every wait between retries. When it runs out, the request stops at once and is not retried.

## Retry Behavior

The provider retries a request up to 3 times when the proof server answers 429, 500 or 503:

| Retry | Wait before it                         |
| ----- | -------------------------------------- |
| 1     | `Retry-After` if present, else 1 second  |
| 2     | `Retry-After` if present, else 2 seconds |
| 3     | `Retry-After` if present, else 4 seconds |

- `Retry-After` may be a number of seconds or an HTTP date. An invalid value falls back to the wait above.
  A wait longer than the timeout ends the request at the timeout. In a browser, a cross-origin proof server must
  expose `Retry-After` through CORS (`Access-Control-Expose-Headers`), otherwise the wait above is used.
- A network failure is also retried, with the waits above.
- 502 and 504 are not retried. A gateway sends them when it gives up waiting, but the proof server keeps
  proving: it proves on a blocking worker thread and cannot cancel a job that has started
  ([`worker_pool.rs`](https://github.com/midnightntwrk/midnight-ledger/blob/main/proof-server/src/worker_pool.rs)).
  A retry would queue the same proof again and double the work.
- A retried network failure carries the same risk: the server may have received the request before the
  connection broke. It is still retried, to keep the behaviour of earlier versions.

## Redirects

The provider does not follow redirects. A redirect from the proof server fails the request with a
`ProofServerError` and is not retried. The request body and the configured `headers` are never sent to the
redirect target. Configure the final proof server URL directly.

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
} from '@midnightntwrk/midnight-js-http-client-proof-provider';
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
