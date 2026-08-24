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
| `./errors` | (own) | `PROTOCOL_ERROR_CODES`, `UnknownProtocolVersionError`, `Ledger8RuntimeMissingError` and the types `ProtocolErrorCode`, `ProtocolVersionUnknownReason`, `VersionResolutionPath` — without pulling in the ledger/compact-js/onchain-runtime/platform namespaces |
| `./version` | (own) | `LEDGER_VERSIONS`, `protocolVersionToLedger`, `versionOfRecord`, `networkHeadVersion` and the types `LedgerVersion`, `ProtocolVersionSource`, `VersionedRecord` — same lightweight guarantee as `./errors` |
| `./ledger` | `@midnightntwrk/ledger-v9` | Ledger types and transaction primitives |
| `./v8` | `@midnightntwrk/ledger-v8` | Previous-era (v8) ledger — do not import at runtime; use `loadLedger8()` |
| `./engine` | (own) | Retained pre-fork execution engine — do not import at runtime; use `loadLedger8Engine()` |
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
import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';

const v8 = await loadLedger8();
const transaction = v8.Transaction.deserialize(rawTransaction);
```

Type-only imports of the subpath are allowed:

```typescript
import type { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8';
```

If the v8 module cannot be loaded (usually a broken or partial install), `loadLedger8()` rejects with `Ledger8RuntimeMissingError` (code `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING`) carrying the original error as `cause`. Its `subpath` field is `'/v8'`, naming which chunk failed. The failed load is not memoised — the next call retries.

## Running Contracts on the Retained Pre-Fork Engine

Contracts compiled against the pre-fork toolchain keep executing on `compact-runtime@0.16` after the fork. That toolchain and its `onchain-runtime-v3` WASM live behind the `./engine` subpath, gated the same way as `./v8` and for the same reason. `loadLedger8Engine()` is the only sanctioned runtime path to it:

```typescript
import { loadLedger8Engine } from '@midnight-ntwrk/midnight-js-protocol';

const engine = await loadLedger8Engine();

const state = engine.downConvertForExecution(engine.extractState(rawContractState, 'v8'));
const transcript = engine.executeCircuit({
  contract,
  circuitId: 'increment',
  args: [],
  state,
  address: contractAddress,
  coinPk: coinPublicKey,
  privateState
});
const prototype = engine.wrapKeepStateCall({ transcript, contractAddress, contractState });
```

The four methods form a pipeline — each result is the next call's input. `contractState` passed to `wrapKeepStateCall` must be the migrated v9 state **as read from chain**: it is where the deployed operation and its verifier key come from, and the key location the prototype carries is derived from that key. A blank or constructor-built state throws `Ledger8ComposeFailedError` (code `MIDNIGHT_JS_P_LEDGER8_COMPOSE_FAILED`) with `stage` naming which lookup failed.

Circuits with Zswap coin effects are not supported on this leg yet: the transcript does not carry the post-call Zswap local state, so `executeCircuit` throws `Ledger8ZswapUnsupportedError` (code `MIDNIGHT_JS_P_LEDGER8_ZSWAP_UNSUPPORTED`) rather than composing a call that would drop the coin movements and be rejected on submission.

A failure to load the chunk itself rejects with `Ledger8RuntimeMissingError` whose `subpath` is `'/engine'`; read `cause` for which module actually failed to resolve.

## Version Module

Mapping a raw `protocolVersion` integer onto the ledger runtime it corresponds to. Reachable from the root barrel and, without loading the ledger/compact-js/onchain-runtime/platform namespaces, from the `./version` subpath. The error it throws is reachable from `./errors` on the same terms.

The `protocolVersion` integer encodes the **node** version as `major * 1_000_000 + minor * 1_000 + patch`, so a whole node major occupies a 1_000_000-wide range:

| protocolVersion range | node version | ledger |
| --------------------- | ------------ | ------ |
| 1_000_000 – 1_999_999 | 1.x          | v8     |
| 2_000_000 – 2_999_999 | 2.x          | v9     |

Anything outside those ranges throws rather than guessing. Node 0.x is deliberately absent: the indexer's own table does map it, but midnight-js meets only node 1.x or 2.x, so a 0.x `protocolVersion` is reported as unknown rather than silently resolved.

```typescript
import {
  LEDGER_VERSIONS,          // readonly ['v8', 'v9']
  protocolVersionToLedger,  // (protocolVersion: number, path?: 'read' | 'construct') => 'v8' | 'v9'   (path defaults to 'construct')
  versionOfRecord,          // (record: { protocolVersion: number }) => 'v8' | 'v9'
  networkHeadVersion        // (source: { queryLatestProtocolVersion(): Promise<number> }) => Promise<'v8' | 'v9'>
} from '@midnight-ntwrk/midnight-js-protocol/version';
import { UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
```

Prefer `versionOfRecord` for a `protocolVersion` already read off an indexer/node record, and `networkHeadVersion` for the network's current head version — both tag any error with the correct path automatically. `UnknownProtocolVersionError` carries a `reason` of `'malformed'` (the input was not a non-negative integer) or `'unknown'` (a well-formed integer outside every mapped range), so callers can distinguish "bad input" from "genuinely unsupported protocol version".

## ESLint Enforcement

Three rules in the repo's `eslint.config.mjs` govern how other packages reach protocol internals.

**1. The protocol ACL** — a `no-restricted-imports` rule prevents direct imports of the underlying protocol packages outside of this package. If you see an error like:

> Import from `@midnight-ntwrk/midnight-js-protocol/ledger` instead.

Replace the direct protocol import with the corresponding subpath from this package. For the v8 era specifically, the error

> Runtime v8 access only via loadLedger8() from @midnight-ntwrk/midnight-js-protocol.

means: replace the direct `./v8` runtime import with `loadLedger8()` (type-only imports stay as they are).

**2. The v8 static-import gate** — `@typescript-eslint/no-restricted-imports` blocks runtime imports of `@midnight-ntwrk/midnight-js-protocol/v8` outside `packages/protocol/src/`. Type-only imports (`import type`) are allowed.

**3. The v8 dynamic-import gate** — `no-restricted-syntax` selectors block `import('@midnight-ntwrk/midnight-js-protocol/v8')` in the same scopes. An interpolated template literal cannot be matched statically and is not covered.

Both v8 gates point at `loadLedger8()`, the accessor on the root barrel — the only sanctioned runtime path to the v8 era.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
