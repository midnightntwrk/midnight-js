# API Changes Reference v4.1.0

## Package: @midnight-ntwrk/midnight-js-level-private-state-provider

### Modified Exports

#### StorageEncryption

**v4.0.4:**
```typescript
class StorageEncryption {
  constructor(password: string, existingSalt?: Buffer);
  encrypt(data: string): string;
  decrypt(data: string): string;
  decryptWithPassword(data: string, password: string): string;
  verifyPassword(password: string): boolean;
  getSalt(): Buffer;
}
```

**v4.1.0:**
```typescript
class StorageEncryption {
  static create(password: string, options?: StorageEncryptionOptions): Promise<StorageEncryption>;
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
  decryptWithPassword(data: string, password: string): Promise<string>;
  verifyPassword(password: string): Promise<boolean>;
  getSalt(): Buffer;
}
```

**Breaking:** Constructor replaced with async factory. All methods now return `Promise`.

#### LevelPrivateStateProviderConfig

**v4.0.4:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly dbName: string;
  // ... existing fields
}
```

**v4.1.0:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly dbName: string;
  readonly cryptoBackend?: CryptoBackendType;
  readonly levelFactory?: LevelFactory;
  // ... existing fields
}
```

**Non-breaking:** New optional fields added.

#### invalidateEncryptionCache

**v4.0.4:**
```typescript
function invalidateEncryptionCache(): void;
```

**v4.1.0:**
```typescript
function invalidateEncryptionCache(): Promise<void>;
```

**Breaking:** Return type changed from `void` to `Promise<void>`.

### New Exports

#### CryptoBackend (interface)

```typescript
interface CryptoBackend {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, keyLength: number): Promise<Uint8Array>;
  aesGcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }>;
  aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, authTag: Uint8Array): Promise<Uint8Array>;
}
```

#### CryptoBackendType

```typescript
type CryptoBackendType = 'webcrypto' | 'noble';
```

#### StorageEncryptionOptions

```typescript
interface StorageEncryptionOptions {
  existingSalt?: Buffer;
  cryptoBackend?: CryptoBackendType;
}
```

#### LevelFactory

```typescript
type LevelFactory = (dbName: string) => DatabaseLevel;
```

#### DatabaseLevel

```typescript
type DatabaseLevel = AbstractLevel<string | Buffer | Uint8Array, string, string>;
```

---

## Package: @midnight-ntwrk/midnight-js-protocol (NEW)

### Barrel Export

```typescript
export * as compactJs from '@midnight-ntwrk/compact-js';
export * as compactRuntime from '@midnight-ntwrk/compact-runtime';
export * as ledger from '@midnight-ntwrk/ledger-v8';
export * as onchainRuntime from '@midnight-ntwrk/onchain-runtime-v3';
export * as platform from '@midnight-ntwrk/platform-js';
```

### Subpath Exports

Each subpath re-exports `*` from the underlying protocol package:
- `./ledger` -> `@midnight-ntwrk/ledger-v8`
- `./compact-runtime` -> `@midnight-ntwrk/compact-runtime`
- `./compact-js` -> `@midnight-ntwrk/compact-js`
- `./compact-js/effect` -> `@midnight-ntwrk/compact-js/effect`
- `./compact-js/effect/Contract` -> `@midnight-ntwrk/compact-js/effect/Contract`
- `./onchain-runtime` -> `@midnight-ntwrk/onchain-runtime-v3`
- `./platform-js` -> `@midnight-ntwrk/platform-js`
- `./platform-js/effect/Configuration` -> `@midnight-ntwrk/platform-js/effect/Configuration`
- `./platform-js/effect/ContractAddress` -> `@midnight-ntwrk/platform-js/effect/ContractAddress`

---

## Package: @midnight-ntwrk/testkit-js

### New Exports

#### DAppConnectorWalletAdapter

```typescript
class DAppConnectorWalletAdapter implements ConnectedAPI {
  constructor(
    walletProvider: Pick<MidnightWalletProvider, 'wallet' | 'unshieldedKeystore' | 'zswapSecretKeys' | 'dustSecretKey'>,
    environmentConfiguration: EnvironmentConfiguration,
  );
  // Implements full ConnectedAPI interface from @midnight-ntwrk/dapp-connector-api
}
```

#### DAppConnectorInitialAPI

```typescript
class DAppConnectorInitialAPI implements InitialAPI {
  constructor(
    connectedWallet: ConnectedAPI,
    networkId: string,
    options?: { rdns?: string; name?: string; icon?: string; apiVersion?: string },
  );
}
```

---

## Package: @midnight-ntwrk/midnight-js-indexer-public-data-provider

### Modified Dependencies

`@apollo/client` upgraded from 3.14.0 to 4.1.6 (#666). The provider API is unchanged, but consumers who interact with Apollo Client types directly (e.g., `ApolloClient`, `InMemoryCache`) may need to update for Apollo Client v4 compatibility.

---

## Package: @midnight-ntwrk/midnight-js-fetch-zk-config-provider

### Modified Behavior

#### sendRequest

**v4.0.4:** Accepted any HTTP 200 response regardless of Content-Type.

**v4.1.0:** Rejects responses with `Content-Type: text/html` and includes the full URL and status code in error messages for non-ok responses.

#### `circuitId` validation (#875)

**v4.0.4:** `circuitId` was interpolated directly into the request URL.

**v4.1.0:** `circuitId` is passed through `assertSafeName` and URL segments are constructed with `encodeURIComponent` + `new URL()`. Traversal payloads (`..`, `/`, NUL, etc.) are rejected before any network call.

---

## Package: @midnight-ntwrk/midnight-js-node-zk-config-provider

### Modified Behavior (#875)

`circuitId` is validated via `assertSafeName` before any `path.resolve` call. Traversal payloads are rejected with a descriptive error.

---

## Package: @midnight-ntwrk/midnight-js-compact

### Modified Behavior (#875)

`VersionManager.getVersionDir` is now the single validation choke point for `versionExists`, `getCompactcPath`, and `removeVersion`. The version string is validated via `assertSemVer`, and a containment check is performed before any `rmSync` as defence in depth.

---

## Package: @midnight-ntwrk/midnight-js-utils

### New Exports (#875)

```typescript
const MAX_SAFE_NAME_LENGTH = 255;
function assertSafeName(name: string, label: string): void;
function assertSemVer(version: string, label: string): void;
```

Re-exported from the package root via `security-utils`.

### Modified Behavior (#900)

#### `assertDefined` / `assertUndefined`

**v4.0.4:** Used truthiness checks (`!value` / `value`), so `0`, `''`, `false`, and `0n` were incorrectly rejected by `assertDefined` and incorrectly accepted by `assertUndefined`.

**v4.1.0:** Both helpers now use explicit `=== null || === undefined` checks. Signature is unchanged.

**Behaviour change:** falsy-but-defined values now pass `assertDefined` and fail `assertUndefined`, as documented.

---

## Package: @midnight-ntwrk/midnight-js-level-private-state-provider

### Modified Behavior

#### `StorageEncryption.verifyPassword` (#883)

**v4.0.4:** Compared a single-round SHA-256 hash of the password (stored in memory) — microsecond-scale.

**v4.1.0:** Runs PBKDF2 with the original salt and constant-time-compares the derived key against the in-memory `encryptionKey`. ~300ms per call. On-disk format unchanged.

The internal `passwordHash` field and `hashPassword` helper are removed. A new internal `deriveEncryptionKey(backend, password, salt, iterations)` helper is reused by `create`, `verifyPassword`, and `decryptWithPassword`.

#### `decryptValue` and `isEncrypted` (#885)

**v4.0.4:** `decryptValue` logged `console.debug` and returned raw bytes when `isEncrypted()` returned false. `isEncrypted()` swallowed all errors via a `try/catch` and returned false.

**v4.1.0:** `decryptValue` throws on unrecognized data. The two call sites both live inside `rotateStorePassword`. `isEncrypted` drops its always-false `catch` (`Buffer.from` on string input cannot throw). Read paths (`getState`, `getAllEntries`) inline `isEncrypted` and continue to transparently migrate legacy plaintext.

---

## Package: @midnight-ntwrk/midnight-js-contracts

### Modified Behavior (#869)

`submit-tx.ts` no longer imports `node:fs` or `node:path`. `logTransaction()` previously wrote a debug trace file; the fs/path imports and file writes are removed and `console` logging is preserved. The package is now browser-bundleable.

### New Internal Exports (#876, #877)

The shielded-coin segment routing fix introduces three new symbols in `packages/contracts/src/utils/zswap-utils.ts` (internal — not re-exported from the package barrel):

```typescript
const GUARANTEED_SEGMENT_NUMBER = 0;
const FALLIBLE_SEGMENT_NUMBER = 1;
function zswapStateToSegmentedOffer(
  zswapLocalState: ZswapLocalState,
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
  addressAndChainStateTuple?: { contractAddress: ContractAddress; zswapChainState: ZswapChainState },
  partitionedTranscript?: PartitionedTranscript,
): { guaranteed: UnprovenOffer | undefined; fallible: UnprovenOffer | undefined };
```

`zswapStateToOffer` is preserved as a thin wrapper over `zswapStateToSegmentedOffer()` for callers without a partitioned transcript. `createUnprovenLedgerCallTx` now routes inputs by nullifier match against `claimedNullifiers` and outputs by the union of `claimedShieldedReceives` ∪ `claimedShieldedSpends`, matching ledger v8 `construct.rs`. Cross-segment ambiguity throws explicitly instead of silently routing to the guaranteed offer.

---

## Package: @midnight-ntwrk/testkit-js (additional changes)

### Migrated wallet-sdk imports (#862)

Testkit-js now imports from the new `@midnight-ntwrk/wallet-sdk` barrel package (v1.0.0) instead of individual `wallet-sdk-*` subpackages. Aligns with ledger 8.0.3 binding marker renames and the updated `InMemoryTransactionHistoryStorage` constructor.

Two granular subpath imports remain where the barrel does not re-export: `wallet-sdk-prover-client/effect` and `wallet-sdk-shielded/v1`.

Configuration helpers renamed for clarity:
- `DefaultV1Configuration` -> `DefaultShieldedConfiguration`
- New: `DefaultUnshieldedConfiguration`, `DefaultDustConfiguration`
