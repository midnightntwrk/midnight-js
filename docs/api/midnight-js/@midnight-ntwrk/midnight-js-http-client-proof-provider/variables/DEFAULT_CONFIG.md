[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-http-client-proof-provider](../README.md) / DEFAULT\_CONFIG

# Variable: DEFAULT\_CONFIG

> `const` **DEFAULT\_CONFIG**: `object`

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

Note that `createProofProvider` in `@midnight-ntwrk/midnight-js-types` refuses the v8 era —
it adapts a v9-only `ProvingProvider` — so reach for this provider, not that helper, when
you need both eras.

#### Proving is only the first step
Read this before wiring a v8 flow. `createWalletProvider` and `createMidnightProvider` both
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

## Type Declaration

### timeout

> **timeout**: `number` = `DEFAULT_TIMEOUT`

### zkConfig

> **zkConfig**: `undefined` = `undefined`
