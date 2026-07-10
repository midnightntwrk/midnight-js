# New Features v5.0.0

## Cross-contract call support (#967)

v5.0.0 can assemble, prove, and submit **cross-contract calls** — a single transaction whose call tree spans several deployed contracts, each carrying its own proof.

Because one such transaction needs artifacts for every contract in the tree, proving is driven by a `ZKConfigRegistry` that resolves artifacts across a *set* of compiled-contract sources — the per-contract `ZKConfigProvider`s the application already builds:

```ts
import { ZKConfigRegistry } from '@midnight-ntwrk/midnight-js-types';

// One source per compiled contract the app can call (its own + call targets).
const registry = new ZKConfigRegistry([myContractZkConfig, tokenContractZkConfig]);
```

- **No address registration.** The binding from a call to its artifacts is *derived* by joining on the verifier key: each key location embeds the SHA-256 of the call's deployed verifier key (known at assembly from the contract's resolved on-chain state), and resolution selects the source whose local verifier key for that circuit matches. The join is exactly the predicate the chain enforces (a proof must verify against the deployed key), so it is immune to redeploys, multiple deployments of one contract, and circuit-name collisions across contracts. Resolutions are memoized.
- `resolveKeyLocation()` returns `undefined` for non-contract key locations (e.g. a `midnight/` protocol builtin) and throws `ZKArtifactNotFoundError` when a contract location's embedded hash matches no source.
- The canonical grammar — `contract:<address-hex>/<circuitId>?vk=<sha-256 of the deployed verifier key>` — is defined once upstream in `@midnight-ntwrk/compact-js` and re-exported via `@midnight-ntwrk/midnight-js-protocol/compact-js` (`ContractKeyLocation`, `encodeContractKeyLocation`, `parseContractKeyLocation`, `hashVerifierKey`).

Cross-contract call assembly resolves on-chain state at a chosen block via the new **"as-of" endpoint** on `PublicDataProvider`:

```ts
import type { BlockInfo } from '@midnight-ntwrk/midnight-js-types';

const latest: BlockInfo | null = await publicDataProvider.queryBlock();                        // latest block
const at = await publicDataProvider.queryBlock({ type: 'blockHeight', blockHeight: 12_345 });  // by height
// or { type: 'blockHash', blockHash }. BlockInfo = { hash: string; height: number }; null if no match.
```

---

## MIP-0002 contract events on `PublicDataProvider` (#988)

The `PublicDataProvider` can now read and stream decoded on-chain **contract events**, sourced from the indexer's server-side-decoded scalar fields (per the MIP-0002 indexer-events spec, rev 2).

### Querying (point-in-time, paged)

```ts
import type { ContractEvent, ContractEventQueryFilter } from '@midnight-ntwrk/midnight-js-types';

const filter: ContractEventQueryFilter = {
  contractAddress,
  fromBlock: 100,   // inclusive
  toBlock: 200,     // inclusive — pin for stable multi-page offsets
};

const events: ContractEvent[] = await publicDataProvider.queryContractEvents(
  filter,
  { limit: 50, offset: 0 },
);
```

`offset` is only stable within a window with a fixed upper bound, so pin `toBlock` for multi-page reads — or prefer the iterator helper.

### Iterating every matching event

```ts
import { getAllContractEvents } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

for await (const event of getAllContractEvents(publicDataProvider, filter)) {
  handle(event);
}
```

### Streaming (replay-from-cursor, then live tail)

```ts
import type { ContractEventCursor, ContractEventSubscriptionFilter } from '@midnight-ntwrk/midnight-js-types';

const cursor: ContractEventCursor = { fromBlock: 100 }; // or { fromId: 42 } — fromId xor fromBlock, both numbers
const subscription: ContractEventSubscriptionFilter = { contractAddress /*, toBlock */ };

// The start cursor is passed via opts.startAt (not positionally).
publicDataProvider
  .contractEventsObservable(subscription, { startAt: cursor })
  .subscribe((event) => handle(event));
```

`{ fromId }` resumes **inclusively** from a known event id — to resume *after* the last seen event, pass `{ fromId: lastSeenId + 1 }`. Omitting `startAt` streams from the start of history.

### The `ContractEvent` union

`ContractEvent` is an 11-variant discriminated union keyed on `eventType` (four `Shielded*`, four `Unshielded*`, plus `Paused` / `Unpaused` / `Misc`). A `ContractEventBase` carries the fields common to every variant; each variant adds its own:

```ts
type ContractEvent =
  | (ContractEventBase & { eventType: 'ShieldedSpend';   nullifier: string })
  | (ContractEventBase & { eventType: 'ShieldedReceive'; commitment: string; ciphertext?: string; receivingContractAddress?: string })
  | (ContractEventBase & { eventType: 'ShieldedMint';    commitment: string; domainSep: string; amount?: string })
  | (ContractEventBase & { eventType: 'ShieldedBurn';    nullifier: string; amount?: string })
  | (ContractEventBase & { eventType: 'UnshieldedSpend';   sender: ContractEventAddress; domainSep: string; tokenType: string; amount: string })
  | (ContractEventBase & { eventType: 'UnshieldedReceive'; recipient: ContractEventAddress; domainSep: string; tokenType: string; amount: string })
  | (ContractEventBase & { eventType: 'UnshieldedMint';    domainSep: string; tokenType: string; amount: string })
  | (ContractEventBase & { eventType: 'UnshieldedBurn';    sender: ContractEventAddress; tokenType: string; amount: string })
  | (ContractEventBase & { eventType: 'Paused' })
  | (ContractEventBase & { eventType: 'Unpaused' })
  | (ContractEventBase & { eventType: 'Misc'; name: string; payload: string });
```

Notable schema-driven decisions:

- `sender` / `recipient` (on the `Unshielded*` variants) map to `ContractEventAddress = { kind: 'user' | 'contract'; value }` (the schema's tagged `Either<ZswapCoinPublicKey, ContractAddress>` is an object, not a scalar).
- `amount` is always a `string` (encodes up to a 16-byte integer) — never round it through `Number()`. Absent nullable fields are normalized to `undefined`, never `null`.
- `Misc` carries an opaque `{ name, payload }`.
- The node→`ContractEvent` mapper **fails fast** on an unknown `__typename` or a missing required field (it never silently produces `undefined`), and carries a compile-time exhaustiveness guard so a schema change becomes a type error rather than runtime drift.

> The query / streaming surface covers all 11 variants. Contract-side **emission** of MIP-0002 events requires `compactc 0.33.0-rc.1` + `compact-runtime 0.18.x` and is exercised end-to-end by an emit→indexer contract-events test (#993) for all shielded events and unshielded **mint/burn**. Unshielded **spend/receive** remain skipped pending an indexer decode fix (midnight-indexer#1279); **Misc** is skipped separately because proving `emitMisc` — the suite's heaviest circuit (~5× the next-largest zkir) — needs a proof-server-side fix. Neither is usable end-to-end yet.

---

## MIP-0002 log events on `CallResult` (#1083)

The two MIP-0002 surfaces are complementary. #988 reads events **off-chain, from the indexer**, after a transaction lands. This one exposes the same events **synchronously, from the local execution result** of a call — `compact-js` already computes them on `ContractExecutable.CallResult.events`, but `midnight-js` was destructuring the executor result without `events` and dropping them.

`CallResultPublic` now carries them:

```ts
interface CallResultPublic {
  // ...existing fields
  readonly events: LogEvent[]; // execution-wide, in emission order, tagged by emitting contract address
}
```

Events are carried **raw** (no eager decode). Decode them with the `ContractLog` helper, re-exported from `compact-js` through the `midnight-js` barrel — so you never take a direct dependency on `compact-js`:

```ts
import { contracts } from '@midnight-ntwrk/midnight-js';

const result = await callTx(/* ... */);

// lenient: never throws — undecodable entries are skipped
const logs = contracts.ContractLog.decodeAll(result.public.events);
```

The single `events` list spans the whole call tree (all contracts touched by a cross-contract call), in emission order.

---

## `provider(options)` factories for proof and ZK-config providers (#1078)

The provider layer moves toward a uniform `provider(options)` convention: wire a provider by passing one options object instead of remembering positional-argument order. **Additive and backward-compatible** — existing positional and class-based usage keeps working.

`httpClientProofProvider` gains an object-options form with a flattened config:

```ts
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

// new — preferred
const proofProvider = httpClientProofProvider({
  url: 'https://proof-server.example',
  zkConfigProvider,
  timeout: 30_000, // optional
  headers: { authorization: `Bearer ${token}` }, // optional
});

// old — still works, now marked @deprecated for one release cycle
const legacy = httpClientProofProvider('https://proof-server.example', zkConfigProvider);
```

The ZK-config providers gain thin factory functions alongside the existing classes (the classes stay exported for subclassing/composition):

```ts
import { nodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';

const zkNode = nodeZkConfigProvider(options);
const zkFetch = fetchZkConfigProvider(options);
```

> Low-level `httpClientProvingProvider` is intentionally left positional and tracked as a follow-up — converting it re-couples internal test mocks and it is a lower-traffic advanced-scenarios primitive.

---

## Disposable `IndexerPublicDataProvider` with structured config (#961)

Phase 2 of #808 (closes #820). The indexer provider gains a structured configuration object, becomes a class (`IndexerPublicDataProvider`), and exposes explicit resource cleanup.

```ts
import {
  indexerPublicDataProvider,
  IndexerPublicDataProvider,
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

// Preferred: object-config form. Returns the concrete IndexerPublicDataProvider.
const provider: IndexerPublicDataProvider = indexerPublicDataProvider({
  queryURL,            // indexer HTTP/GraphQL endpoint
  subscriptionURL,     // indexer WebSocket endpoint
  pollInterval: 1_000, // optional; defaults to DEFAULT_POLL_INTERVAL (1000ms)
});

// ... use the provider ...

await provider.dispose(); // releases the underlying graphql-ws WebSocket
```

- The structured config is `{ queryURL, subscriptionURL, webSocket?, pollInterval? }`. An invalid `pollInterval` (non-integer, `0`, or negative) fails fast at construction.
- `dispose()` (on the concrete `IndexerPublicDataProvider`) stops the Apollo client then awaits the `graphql-ws` teardown; concurrent dispose calls share one in-flight promise (no double teardown under `Promise.all`).
- The positional factory form `indexerPublicDataProvider(queryURL, subscriptionURL, webSocket?)` is retained but `@deprecated` — migrate to the object form.

---

## Classified deserialization / versioning errors (#955)

Foundation for issue #816. A new `deserialization` module in `@midnight-ntwrk/midnight-js-utils` converts cryptic ledger/runtime deserialization failures into structured, classified errors.

```ts
import {
  deserializeContractState,
  isDeserializationError,
} from '@midnight-ntwrk/midnight-js-utils';

try {
  const state = deserializeContractState(bytes);
} catch (error) {
  if (isDeserializationError(error)) {
    error.classification; // 'version-mismatch' | 'generic-param-mismatch' | 'format-mismatch' | 'unknown'
    error.mitigation;     // actionable, per-source hint
  }
  throw error;
}
```

- `DeserializationError` with classification, direction inference, per-source mitigation hints, and structural-tag extraction.
- `isDeserializationError` type guard with a cross-realm brand-check fallback (Web Worker boundaries, npm hoist mismatches).
- 6 typed wrappers (`deserializeContractState`, …, `decodeLedgerStateValue`) as the primary API; `withDeserializationContext` HOF as an escape hatch (sync-only — it guards against thenable returns).

---

## ZK artifact integrity verification (#1015)

`FetchZkConfigProvider` and `NodeZkConfigProvider` now verify every ZK artifact they load against the `compactc`-emitted integrity manifest (`compiler/contract-manifest.json`). A new `zk-artifact-manifest` module in `@midnight-ntwrk/midnight-js-utils` parses the manifest and drives the check.

```ts
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';

// Default: fail-closed. A missing manifest or a digest mismatch throws ZkArtifactIntegrityError.
const provider = new NodeZkConfigProvider(baseDir);

// Explicit control via ZkConfigIntegrityOptions:
const lenient = new NodeZkConfigProvider(baseDir, {
  verify: 'warn',                        // 'require' (default) | 'warn' | 'off'
  onWarn: (msg) => logger.warn(msg),     // default: console.warn
  expectedManifestHash: MANIFEST_SHA256, // pin to resist a coordinated artifact+manifest swap
});
```

Exports from `@midnight-ntwrk/midnight-js-utils`: `ZkArtifactManifest`, `ZkArtifactManifestFile`, `ZkConfigIntegrityOptions`, `ZkArtifactIntegrityMode`, `ZkArtifactIntegrityError`, and the `ZK_MANIFEST_DIR` / `ZK_MANIFEST_FILE_NAME` constants. See [breaking-changes.md](./breaking-changes.md) for the fail-closed default.

---

## Deflate-compressed subscriptions (#977)

The indexer provider negotiates the `graphql-transport-ws+deflate` WebSocket subprotocol and transparently inflates compressed subscription frames. Decompression uses the universal `DecompressionStream` global (RFC 1950 zlib), covering Node ≥ 18 and modern browsers (Chrome 80 / Firefox 113 / Safari 16.4+). It is entirely transparent to callers:

- The user-supplied WebSocket is wrapped before it reaches `graphql-ws`; mixed compressed/plain frame ordering is preserved via a promise queue.
- If the server selects the plain subprotocol, it falls back with no behavioral change.
- A **16 MiB hard cap** on inflated payload size guards against compression-bomb DoS.

No API change is required — construct the provider as before and compression is negotiated automatically when the server supports it.

---

## Contract-event GraphQL schema enhancements (#971, #975)

The generated contract-event GraphQL schema was enhanced with transaction references and beta markers, richer contract-event types, and **dust generation** support — underpinning the `PublicDataProvider` event surface above.
