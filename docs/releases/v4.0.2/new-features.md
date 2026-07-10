# New Features v4.0.2

## 1. Headers Support in `httpClientProvingProvider` (#685)

The HTTP client proving provider now supports custom headers for all requests to the proof server. This enables authentication tokens, API keys, or other custom headers to be forwarded with proof generation and verification requests.

### Usage

```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/http-client-proof-provider';

const provider = httpClientProvingProvider(zkConfigProvider, proofServerUrl, {
  timeout: 60_000,
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Custom-Header': 'value'
  }
});
```

### API

```typescript
export interface ProvingProviderConfig {
  readonly timeout?: number;
  readonly headers?: Record<string, string>;  // NEW
}
```

Headers are merged with `{ 'Content-Type': 'application/octet-stream' }` as the base, so custom headers take precedence over defaults.

---

## 2. `isEffectContractError` Type Guard (#712)

A new type guard for safely narrowing Effect-ts contract errors without `as any` casts. Used internally in `unproven-call-tx.ts` and `unproven-deploy-tx.ts`, and exported from `@midnight-ntwrk/midnight-js-contracts` for use in custom error handling.

### Usage

```typescript
import { isEffectContractError } from '@midnight-ntwrk/midnight-js-contracts';

try {
  await executeCircuit();
} catch (error) {
  if (isEffectContractError(error) && error._tag === 'ContractRuntimeError') {
    // Safely access error.cause without any casts
    console.error(error.cause.message);
  }
}
```
