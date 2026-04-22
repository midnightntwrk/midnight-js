# API Changes Reference v4.1.0

## Package: @midnight-ntwrk/midnight-js-level-private-state-provider

### Modified Exports

#### StorageEncryption

**v4.0.4:**
```typescript
class StorageEncryption {
  constructor(password: string, options?: { existingSalt?: Buffer });
  encrypt(data: string): string;
  decrypt(data: string): string;
  decryptWithPassword(data: string, password: string): string;
  verifyPassword(password: string): boolean;
  get salt(): Buffer;
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
  get salt(): Buffer;
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
- `./compact-js/effect-contract` -> `@midnight-ntwrk/compact-js/effect-contract`
- `./onchain-runtime` -> `@midnight-ntwrk/onchain-runtime-v3`
- `./platform-js` -> `@midnight-ntwrk/platform-js`
- `./platform-js/effect-configuration` -> `@midnight-ntwrk/platform-js/effect-configuration`
- `./platform-js/effect-contract-address` -> `@midnight-ntwrk/platform-js/effect-contract-address`

---

## Package: @midnight-ntwrk/testkit-js

### New Exports

#### DAppConnectorWalletAdapter

```typescript
class DAppConnectorWalletAdapter implements ConnectedAPI {
  constructor(walletProvider: MidnightWalletProvider);
  // Implements full ConnectedAPI interface from @midnight-ntwrk/dapp-connector-api
}
```

#### DAppConnectorInitialAPI

```typescript
class DAppConnectorInitialAPI implements InitialAPI {
  constructor(walletAdapter: DAppConnectorWalletAdapter, expectedNetworkId: string);
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
