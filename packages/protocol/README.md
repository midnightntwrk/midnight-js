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
| `./errors` | (own) | `PROTOCOL_ERROR_CODES` and every error class and error type this package raises — without pulling in the ledger/compact-js/onchain-runtime/platform namespaces. `protocol-acl.test.ts` pins the exact list |
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

## Source Layout

Nothing under `src/lib/` is a build entry, so this layout is internal and no consumer import path depends on it. Its job is to make one question answerable from a path alone: *which ledger does this touch?*

| Directory | Holds | Ledger reference |
|---|---|---|
| `lib/v8/` | the retained pre-fork era: `load.ts`, `engine.ts`, `load-engine.ts`, `instance-guard.ts`, `down-convert.ts`, `execute.ts`, `compose.ts`, `deploy.ts`, `adapt.ts` | acquires `ledger-v8`, `onchain-runtime-v3` and the 0.16 glue, always through a dynamic import |
| `lib/v9/` | the current era's composition arms: `compose.ts`, `wrap.ts` | links `ledger-v9` statically |
| `lib/shared/` | what both arms run: `ledger-version.ts`, `verifier-keys.ts`, `compose-options.ts`, `assemble-call.ts`, `compose-types.ts`, `unshielded.ts`, `contract-state.ts` | era passed in as a `LedgerVersion` parameter, never chosen here |
| `lib/era/` | the facade and the dispatch: `load-era.ts`, `era.ts`, `envelope.ts` | reaches both, which is the point of the layer |

The directory names say what a module is **about**, not what it links. Three consequences a reader should not have to derive:

- **`lib/v8/compose.ts`, `deploy.ts` and `adapt.ts` link no v8 at all.** They take the acquired module as a `ProtocolV8` parameter, which is a type. That injection is what keeps the v8 WASM out of the eager graph, and the guarantee is enforced by `dist-laziness.test.ts` and `v8-surface.test.ts` — not by this layout. Read the tests, not the directory, for the bundle boundary.
- **`lib/shared/` is not free of vendors.** `assemble-call.ts` links `@midnight-ntwrk/compact-js`, a post-fork package, for `hashVerifierKey` and `encodeContractKeyLocation`; `contract-state.ts` links it for `hashVerifierKey`. Both are called by both arms, so their subject is shared even though their linkage is not. This is safe in one direction only: v9 is the eagerly-linked baseline, so a shared module reaching for it never wakes v8, while the reverse would.
- **`lib/v9/wrap.ts` type-imports `lib/v8/execute.ts`.** `TranscriptPojo` is the v8 engine's output and `wrapKeepStateCall` binds it onto v9. The cross-era edge is the operation's whole purpose, and it is type-only.

`compose-types.ts` and `era.ts` name their shared types through `@midnightntwrk/ledger-v9` because some vendor has to name them. `EncodedStateValue`, `Op`, `AlignedValue` and `Transcript` are pinned identical across `onchain-runtime-v3`, `ledger-v8` and `ledger-v9` by the compile-time assertions in `v8-down-convert.test.ts`; the import names one era, the type belongs to neither. Those assertions are evaluated by `yarn typecheck:tests` on the pre-push hook, not by CI — vitest transpiles test files without type-checking, so treat a failure there as the only signal you will get.

## Architecture Documents

The reasoning behind this package's shape lives in `docs/`, not in the source
docstrings. Each file is registered with TypeDoc through `projectDocuments`, so
it is a page in the generated API reference and `@see {@link Title}` in a
docstring resolves to it.

| Document | What it explains |
|---|---|
| [Era seam](./docs/era-seam.md) | Why only bytes and plain objects cross between the eras, how the eight operations are split between `LedgerEra` and `Ledger8Engine`, and the memoisation rules |
| [Retained-era execution](./docs/retained-era-execution.md) | The down-conversion stages, the Merkle rehash requirement, the era pin, and what a `TranscriptPojo` carries |
| [Dual-instantiation guard](./docs/dual-instantiation-guard.md) | What a duplicate WASM install does in the argument position versus the receiver position, and why the guard is a correctness requirement rather than a diagnostic |
| [Fail-closed decoding](./docs/fail-closed-decoding.md) | Why the envelope is the only authority over the bytes, and the division of labour between the three decode failures |
| [Compose refusal order](./docs/compose-refusal-order.md) | The order in which both era arms refuse compose options, and the one deliberate difference between them |
| [Verifier keys](./docs/verifier-keys.md) | Registration rules, the refusals that stop a deploy landing at an address the caller's artifacts do not describe, and why the address cannot be recomputed |
| [Module graph and lazy loading](./docs/module-graph-and-lazy-loading.md) | Build entries, the `./v8` and `./engine` chunks, the import cycle avoided by a leaf module, and derived versus structural vendor types |
| [Shared table discipline](./docs/shared-table-discipline.md) | Why the shared tables are frozen and null-prototyped, and why exhaustiveness is enforced at compile time as well as at run time |

Docstrings in `src/` carry the API contract: what a symbol does, its
parameters, what it returns and what it throws. Anything that answers "why is
it built this way" belongs in a document above, stated once.

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
import { loadLedger8Engine, loadLedgerEra, versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';

const engine = await loadLedger8Engine();
const era = await loadLedgerEra(versionOfRecord(indexerRecord));

const state = engine.downConvertForExecution(era.extractState(rawContractState));
const transcript = engine.executeCircuit({
  contract,
  circuitId: 'increment',
  args: [],
  state,
  address: contractAddress,
  coinPk: coinPublicKey,
  privateState
});
const prototype = engine.wrapKeepStateCall({ transcript, contractAddress, contractState: migratedV9ContractState });
```

The engine exposes `downConvertForExecution`, `executeCircuit`, `executeConstructor` and `wrapKeepStateCall`, and they form a pipeline, each result being the next call's input. Reading a contract state and composing a call or a deploy are **not** here: both eras do those, so they live on the [ledger-era facade](#ledger-era-facade) instead.

`migratedV9ContractState` passed to `wrapKeepStateCall` must be the migrated v9 state **as read from chain**, which is not `rawContractState` above: it is where the deployed operation and its verifier key come from, and the key location the prototype carries is derived from that key. A blank or constructor-built state throws `ComposeFailedError` (code `MIDNIGHT_JS_P_COMPOSE_FAILED`) with `stage` naming which lookup failed and `version` naming the ledger era it was composing for.

Circuits with Zswap coin effects run on this leg like any other. The transcript carries `zswapLocalState` — the post-call Zswap local state, decoded into the runtime's public shape — which is what you turn into the transaction's segmented Zswap offer (`zswapStateToSegmentedOffer` in `@midnight-ntwrk/midnight-js-contracts`) and pass to `composeCallTx` as `guaranteedZswapOffer` / `fallibleZswapOffer`. Dropping it is what would leave you composing a transaction missing the coin movements the circuit recorded.

The transcript also carries `partitionContext` — the block, the starting effects and the commitment indices the pre-fork query context recorded while the circuit ran. Pass it on unchanged: a transcript composed without it is partitioned against a context the circuit never ran on, and a circuit that RECEIVED a coin in-contract cannot be partitioned at all, because the index its commitment was registered at lives only in that context. `wrapKeepStateCall` carries it for you; a hand-built call entry has to supply it. A context the target era cannot read throws `ComposeFailedError` with `stage: 'call-partition-context'`.

A failure to load the chunk itself rejects with `Ledger8RuntimeMissingError` whose `subpath` is `'/engine'`; read `cause` for which module actually failed to resolve.

## Ledger-Era Facade

Two ledger eras are live at once: `v8` backs the node 1.x line and `v9` the 2.x line. `loadLedgerEra` hands you one of them as a single object with the same methods on both, so code that has resolved which era a record belongs to does not then have to branch on it.

```typescript
import { loadLedgerEra, versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';

const era = await loadLedgerEra(versionOfRecord(indexerRecord));

const state = era.extractState(rawContractState);
const decoded = era.decodeContractState(rawContractState);
const callTx = era.composeCallTx({ calls, networkId, ttl });
const deploy = era.composeDeployTx({ contractState, verifierKeys, networkId, ttl });
```

| Method | What it does |
| ------ | ------------ |
| `version` | The era this object is bound to — the value that was passed in |
| `extractState` | Reads the primary state out of a raw contract-state envelope |
| `decodeContractState` | Reads an envelope into its state plus the entry points it declares, each with its verifier key and that key's hash |
| `composeCallTx` | Composes an UNPROVEN call transaction and serializes it |
| `composeDeployTx` | Composes an UNPROVEN deploy and returns it with the address it will have and the initial state that address came from |

Derive the era with `versionOfRecord` or `networkHeadVersion` (see [Version Module](#version-module)) rather than writing the string by hand. An era string that is not `'v8'` or `'v9'` rejects with `UnknownLedgerVersionError`; the offending value is on the error's `requestedVersion` field, not in its message.

Each era is memoised, so the retained pre-fork WASM is instantiated at most once per process. Asking for `'v8'` is what acquires it — a consumer that only ever asks for `'v9'` never loads it at all, which is gated by `dist-laziness.test.ts`. A **failed** v8 acquisition is not memoised: the rejection propagates unchanged as `Ledger8RuntimeMissingError` and the next call retries.

### Only bytes and plain objects cross this boundary

Every value going in or coming out is plain data — `Uint8Array`s and plain objects — never a live WASM handle. A contract state goes in as the bytes it was serialized to and comes back as an `EncodedStateValue` plus plain entry-point records; a composed transaction comes back as bytes. So a result can be stored, compared across eras, or sent through a `structuredClone` or a worker boundary without the module that produced it. `era-parity.test.ts` asserts exactly that, on every method, for both eras.

Because the methods are synchronous, all the awaiting happens once, at `loadLedgerEra`.

### Where the two eras differ

The same method names mostly mean the same capabilities. One thing the v8 arm refuses that the v9 arm accepts:

- **A call tree.** The v8 arm composes exactly one call. A cross-contract call is a ledger-9-only feature a pre-fork contract cannot emit, so that era has no call tree to express: a `calls` list longer than one throws `ComposeOptionError` with `option: 'calls'` rather than composing the first entry and dropping the rest.

**A Zswap offer is not one of them.** Both eras read `guaranteedZswapOffer` / `fallibleZswapOffer` and carry the resulting offer into the transaction; both throw `ComposeOptionError` with `option: 'zswapOffer'` for bytes their own decoder rejects, with the decoder's failure on `cause`. A coin-moving call composes on either era.

The v8 arm also *requires* `verifierKeys` on `composeDeployTx`, where the v9 arm accepts its omission in one case. The retained deploy leg registers the compiled contract's keys onto the initial state itself, so it always needs the map; omitting it throws `ComposeOptionError` with `option: 'verifierKeys'`. The v9 arm allows the omission only for a state that ALREADY carries its keys, and checks rather than assumes it: a state still declaring a blank-keyed entry point throws the same `ComposeOptionError` with the same `option`. So the two arms agree on every input except one — a pre-keyed state, which deploys as-is on v9 and needs its keys supplied again on v8.

What is *not* asymmetric: a call's user-addressed unshielded payouts are aggregated onto the transaction's guaranteed and fallible offers on **both** eras. Attaching them on one era only would leave the other composing an unbalanced transaction the node rejects on submission, with nothing having reported a problem at composition time — so `era-parity.test.ts` asserts the payout each segment carries, per era.

### Errors

| Error | Code | Raised when |
| ----- | ---- | ----------- |
| `StateDecodeFailedError` | `MIDNIGHT_JS_P_STATE_DECODE_FAILED` | A contract-state envelope could not be read by the era it was requested for — most often a state written by the other era |
| `ComposeFailedError` | `MIDNIGHT_JS_P_COMPOSE_FAILED` | Something about a CALL or a DEPLOY could not be composed: an operation that is missing, unkeyed, or names a circuit the contract does not declare; an empty call list; a pre-call state or a recorded query context the era cannot bridge; a supplied transcript with neither half; a public transcript or a set of call inputs the ledger itself rejected; or a claimed payout the transaction cannot settle (dust, or a shielded token type). `stage` is a closed union naming which of those it was — see its own docs for the full list; `version` names the era |
| `ComposeOptionError` | `MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID` | A transaction-wide OPTION cannot be used at all — an empty network id, an invalid ttl, a contract state whose envelope the era rejected, an offer the era's decoder rejected, a missing verifier-key map, or a call list longer than the era can compose. `option` names the field, `version` names the era |
| `UnknownLedgerVersionError` | `MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION` | The requested era is not `'v8'` or `'v9'` |

Each names the era it was raised for — `version` on the first three, `requestedVersion` on `UnknownLedgerVersionError`, which also takes no `cause`. None renders hex or a byte dump of its own, and the first three preserve the underlying runtime failure on `cause` where there was one.

### Planned follow-ups

Recorded here so the reasoning is not lost, and deliberately NOT done in the change that introduced this facade:

- **Collapse the version dispatch in `lib/era/envelope.ts`.** `extractEncodedStateValue` has one production caller, which passes the literal `'v8'`; the v9 arm calls `extractV9EncodedStateValue` directly. The decoder table, the unknown-version guard and the null-prototype defence are therefore only reachable from tests, and the per-file 100% floor keeps the tests that reach them alive. Collapsing it to a `extractV8EncodedStateValue` beside the v9 one deletes real tests, which belongs in its own change.
- **Give `StateDecodeFailedError` a `stage`.** `decodeContractStateWith` wraps the whole read, so a state that decoded fine but declares an entry point resolving to no operation is reported with the same code and the same "resolve the era and check the bytes" remediation as an envelope written by the other era. A discriminator would separate them; it is a public error-shape change.
- **Give `ComposeOptionError` a `circuitId`.** The v9 blank-key refusal knows which entry point was blank and cannot say so, because the field does not exist. Adding it would let that refusal name the slot without breaking the class parity the two arms currently have.

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
