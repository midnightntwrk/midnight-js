[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

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
import { unwrapV9 } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);
// Transaction payloads cross a provider seam version-tagged: tag on the way
// in, narrow on `version` on the way out. There is no untagged form.
// `unwrapV9` throws V8PayloadUnsupportedError or UntaggedPayloadError, both
// carrying a stable `code` you can match with `hasErrorCode`. That applies to
// the seam's own refusals — the ones raised before proving starts. A failure
// from inside proof generation is whatever the ledger runtime raises, on
// either era, and carries no midnight-js code.
const provenTx = unwrapV9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
```

### Both ledger eras
This provider serves the retained (`v8`) era as well as the current one. A retained-era
transaction crosses the seam as serialized bytes in both directions, and comes back in the
same arm it was sent in:

```typescript
const proven = await proofProvider.proveTx({ version: 'v8', txBytes: unprovenTxBytes });
if (proven.version === 'v8') {
  // `proven.txBytes` is the serialized, proven transaction.
}
```

The era is carried by the `version` tag, never inferred from the payload. Note that
`createProofProvider` in `@midnight-ntwrk/midnight-js-types` refuses the retained arm — it
adapts a current-era-only `ProvingProvider` — so reach for this provider, not that helper, when
you need both eras.

#### Proving is only the first seam
Read this before wiring a retained-era flow. `createWalletProvider` and
`createMidnightProvider` both refuse the retained arm, so a retained-era transaction wired
through them **proves successfully and is then refused at `balanceTx`** — after a full proving
cycle, not at the first seam. To run one end to end, implement `WalletProvider` and
`MidnightProvider` against the version-tagged interfaces directly. Why the adapters refuse
permanently is recorded in `docs/adr/0006-version-tagged-payloads-at-provider-seams.md`.

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
