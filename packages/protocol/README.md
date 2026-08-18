# Protocol

Version-agnostic re-exports of Midnight protocol packages. Decouples framework consumers from specific protocol version numbers, so that protocol upgrades require changes only in this package.

## Versioning Contract

**This package must never include a protocol version number in its name.** The package name `@midnight-ntwrk/midnight-js-protocol` is permanent. If the package were renamed to `midnight-js-protocol-v2` or similar, every consumer import would need updating, defeating the purpose of this abstraction.

Protocol version changes are handled through:
- **semver** (npm package version): major bump when underlying protocol packages change in a breaking way
- **internal re-exports**: this package updates which concrete protocol packages it re-exports

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-protocol
```

## Usage

Import protocol types through version-agnostic subpaths:

```typescript
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type CompactRuntime } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { type OnChainRuntime } from '@midnight-ntwrk/midnight-js-protocol/onchain-runtime';
import { createPlatform } from '@midnight-ntwrk/midnight-js-protocol/platform-js';
```

## Sub-path Exports

| Sub-path | Re-exports | Description |
| -------- | ---------- | ----------- |
| `./errors` | (own) | `PROTOCOL_ERROR_CODES` and `UnknownProtocolVersionError` without pulling in the ledger/compact-js/onchain-runtime/platform namespaces |
| `./ledger` | `@midnightntwrk/ledger-v9` | Ledger types and transaction primitives |
| `./v8` | `@midnightntwrk/ledger-v8` | Previous-era (v8) ledger — do not import at runtime; use `loadV8()` |
| `./compact-runtime` | `@midnight-ntwrk/compact-runtime` | Compact contract runtime utilities |
| `./compact-js` | `@midnight-ntwrk/compact-js` | Compact JS bindings |
| `./compact-js/effect` | `@midnight-ntwrk/compact-js/effect` | Effect-based Compact bindings |
| `./compact-js/effect/Contract` | `@midnight-ntwrk/compact-js/effect/Contract` | Effect-based Contract module |
| `./onchain-runtime` | `@midnightntwrk/onchain-runtime-v4` | On-chain runtime (Impact VM) |
| `./platform-js` | `@midnight-ntwrk/platform-js` | Platform services |
| `./platform-js/effect/Configuration` | `@midnight-ntwrk/platform-js/effect/Configuration` | Effect-based configuration |
| `./platform-js/effect/ContractAddress` | `@midnight-ntwrk/platform-js/effect/ContractAddress` | Effect-based contract address resolution |

## Accessing the v8 Ledger Era

The `./v8` subpath re-exports the previous-era ledger (`@midnightntwrk/ledger-v8`), which carries its own WASM. To keep that WASM out of eagerly-loaded module graphs, runtime imports of `@midnight-ntwrk/midnight-js-protocol/v8` are blocked by ESLint everywhere outside this package. Use the lazy accessor instead:

```typescript
import { loadV8 } from '@midnight-ntwrk/midnight-js-protocol';

const v8 = await loadV8();
const transaction = v8.Transaction.deserialize(rawTransaction);
```

Type-only imports of the subpath are allowed:

```typescript
import type { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8';
```

If the v8 module cannot be loaded (usually a broken or partial install), `loadV8()` rejects with `Ledger8RuntimeMissingError` (code `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING`) carrying the original error as `cause`. The failed load is not memoised — the next call retries.

## Version Module

The root barrel (and the `./errors` subpath, for the error types) also export a small module for mapping a raw `protocolVersion` integer onto the ledger runtime it corresponds to:

```typescript
import {
  LEDGER_VERSIONS,          // readonly ['v8', 'v9']
  protocolVersionToLedger,  // (protocolVersion: number, path?: 'read' | 'construct') => 'v8' | 'v9'
  versionOfRecord,          // (record: { protocolVersion: number }) => 'v8' | 'v9'
  networkHeadVersion,       // (source: { queryLatestProtocolVersion(): Promise<number> }) => Promise<'v8' | 'v9'>
  UnknownProtocolVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
```

Prefer `versionOfRecord` for a `protocolVersion` already read off an indexer/node record, and `networkHeadVersion` for the network's current head version — both tag any error with the correct path automatically. `UnknownProtocolVersionError` carries a `reason` of `'malformed'` (the input was not a non-negative integer) or `'unknown'` (a well-formed integer outside every mapped range), so callers can distinguish "bad input" from "genuinely unsupported protocol version".

## ESLint Enforcement

An ESLint `no-restricted-imports` rule prevents direct imports of the underlying protocol packages outside of this package. If you see an error like:

> Import from `@midnight-ntwrk/midnight-js-protocol/ledger` instead.

Replace the direct protocol import with the corresponding subpath from this package. For the v8 era specifically, the error

> Runtime v8 access only via loadV8() from @midnight-ntwrk/midnight-js-protocol.

means: replace the direct `./v8` runtime import with `loadV8()` (type-only imports stay as they are).

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
