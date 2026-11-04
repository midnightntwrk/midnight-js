[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

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
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);
// A transaction is passed to a provider as a handle that carries its era, and the
// proven handle comes back in the same era. The provider's own refusals carry a
// stable `code` you can match with `hasErrorCode`. A failure from inside proof
// generation is whatever the ledger runtime raises, on either era, and carries no
// midnight-js code.
const unprovenTx = LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
const provenTx = await proofProvider.proveTx(unprovenTx);
const ledgerProvenTx = LedgerTransaction.unwrap(provenTx, 'v9');
```

### Both ledger eras
This provider serves the v8 era as well as v9, so its `supportedEras` is
`['v8', 'v9']`. A v8 handle is proved the same way and comes back as a v8 handle:

```typescript
const proven = await proofProvider.proveTx(ledger8UnprovenTx);
// proven.era is 'v8'
```

Note that `createLedger9ProofProvider` in `@midnight-ntwrk/midnight-js-types` refuses the v8 era —
it adapts a v9-only `ProvingProvider` — so reach for this provider, not that helper, when
you need both eras.

#### Proving is only the first step
Read this before wiring a v8 flow. `createLedger9WalletProvider` and `createLedger9MidnightProvider` both
refuse the v8 era. Through the framework's own entry points (`submitCallTx` and
`deployContract`), `assertProvidersSupportEra` detects this upfront and raises
`ProviderEraUnsupportedError` (naming `balanceTx`) before any proving work is done. However,
for a flow that calls the three transaction methods by hand, the transaction **proves
successfully and is then refused at `balanceTx` with `ProviderEraUnsupportedError`** — after a
full proving cycle, not at the first step. To run one end to end, build the wallet and
midnight providers with `createWalletProviderFromHandlers` and
`createMidnightProviderFromHandlers`, with a `v8` handler each.

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

> **httpClientProofProvider**\<`K`\>(`options`): [`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)

Creates a high-level [ProofProvider](../../midnight-js/types/interfaces/ProofProvider.md) that implements transaction-level proving
using the low-level circuit-by-circuit [ProvingProvider](https://github.com/midnightntwrk/midnight-ledger) as its foundation.

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

[`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)

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

> **httpClientProofProvider**\<`K`\>(`url`, `zkConfigProvider`, `config?`): [`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)

### Type Parameters

#### K

`K` *extends* `string`

### Parameters

#### url

`string`

The URL of the proof server

#### zkConfigProvider

[`ZKConfigRegistry`](../../midnight-js/types/classes/ZKConfigRegistry.md) \| [`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`K`\>

Provider for zero-knowledge configuration artifacts

#### config?

[`ProvingProviderConfig`](../interfaces/ProvingProviderConfig.md)

Optional configuration for the underlying ProvingProvider

### Returns

[`ProofProvider`](../../midnight-js/types/interfaces/ProofProvider.md)

A ProofProvider instance that uses ProvingProvider internally

### Deprecated

Use the HttpClientProofProviderOptions object form:
`httpClientProofProvider({ url, zkConfigProvider })`.
