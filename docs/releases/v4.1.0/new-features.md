# New Features v4.1.0

## 1. Web Crypto API for Storage Encryption (#798)

`level-private-state-provider` now uses the Web Crypto API (`globalThis.crypto.subtle`) instead of the Node.js `crypto` module for all cryptographic operations: AES-256-GCM encryption/decryption, PBKDF2 key derivation, SHA-256 hashing, and random byte generation.

This enables `level-private-state-provider` to run in browser environments without polyfills.

### Usage

The migration is transparent for `levelPrivateStateProvider` consumers -- the provider handles the async encryption internally. Only direct `StorageEncryption` users need to update (see [Breaking Changes](./breaking-changes.md)).

---

## 2. CryptoBackend Abstraction with Noble Fallback (#827)

A pluggable `CryptoBackend` interface abstracts the cryptographic primitives used by `StorageEncryption`. Two implementations are provided:

- **WebCryptoCryptoBackend** -- delegates to `globalThis.crypto.subtle` (default when available)
- **NobleCryptoBackend** -- pure-JS implementation using `@noble/ciphers` (AES-256-GCM) and `@noble/hashes` (SHA-256, PBKDF2)

Auto-resolution: WebCrypto is preferred when `crypto.subtle` is available; Noble is used as fallback (e.g., React Native without a secure context).

### Usage

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

// Auto-resolve (default): WebCrypto if available, Noble otherwise
const provider = await levelPrivateStateProvider({ ... });

// Force Noble backend (useful for React Native)
const provider = await levelPrivateStateProvider({
  ...config,
  cryptoBackend: 'noble',
});

// Force WebCrypto backend (throws if unavailable)
const provider = await levelPrivateStateProvider({
  ...config,
  cryptoBackend: 'webcrypto',
});
```

### API

```typescript
interface CryptoBackend {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, keyLength: number): Promise<Uint8Array>;
  aesGcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }>;
  aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, authTag: Uint8Array): Promise<Uint8Array>;
}

type CryptoBackendType = 'webcrypto' | 'noble';
```

---

## 3. Injectable levelFactory for React Native (#827)

`LevelPrivateStateProviderConfig` now accepts an optional `levelFactory` function, enabling custom storage backends that extend `AbstractLevel`. This is required for React Native, where the default Node.js `Level` is not available.

### Usage

```typescript
import { levelPrivateStateProvider, type LevelFactory } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const customLevelFactory: LevelFactory = (dbName) => new MyReactNativeLevel(dbName);

const provider = await levelPrivateStateProvider({
  ...config,
  levelFactory: customLevelFactory,
  cryptoBackend: 'noble', // typically paired with Noble for React Native
});
```

### API

```typescript
type DatabaseLevel = AbstractLevel<string | Buffer | Uint8Array, string, string>;
type LevelFactory = (dbName: string) => DatabaseLevel;
```

---

## 4. Protocol ACL Package (#832)

New `@midnight-ntwrk/midnight-js-protocol` package wraps all 5 external protocol packages behind version-agnostic subpath exports. Future protocol version upgrades (e.g., `ledger-v8` -> `ledger-v9`) only require updating this single package.

### Subpath Exports

| Subpath | Wraps |
|---|---|
| `./ledger` | `@midnight-ntwrk/ledger-v8` |
| `./compact-runtime` | `@midnight-ntwrk/compact-runtime` |
| `./compact-js` | `@midnight-ntwrk/compact-js` |
| `./compact-js/effect` | `@midnight-ntwrk/compact-js/effect` |
| `./compact-js/effect-contract` | `@midnight-ntwrk/compact-js/effect-contract` |
| `./onchain-runtime` | `@midnight-ntwrk/onchain-runtime-v3` |
| `./platform-js` | `@midnight-ntwrk/platform-js` |
| `./platform-js/effect-configuration` | `@midnight-ntwrk/platform-js/effect-configuration` |
| `./platform-js/effect-contract-address` | `@midnight-ntwrk/platform-js/effect-contract-address` |

### Usage

```typescript
// Namespace import (barrel)
import { ledger, compactRuntime, compactJs, onchainRuntime, platform } from '@midnight-ntwrk/midnight-js-protocol';

// Subpath imports (recommended)
import { type Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
```

An ESLint rule enforces the ACL imports -- direct protocol imports will produce lint errors.

---

## 5. DAppConnectorWalletAdapter for testkit-js (#855)

New testing infrastructure that enables e2e testing of wallet-delegated proving through `dapp-connector-proof-provider` without a standalone proof server.

### Components

- **DAppConnectorWalletAdapter** -- wraps `MidnightWalletProvider` behind the `ConnectedAPI` interface from `@midnight-ntwrk/dapp-connector-api`, with local WASM proving via zkir-v2
- **DAppConnectorInitialAPI** -- provides `InitialAPI` with networkId validation

### Usage

```typescript
import { DAppConnectorWalletAdapter, DAppConnectorInitialAPI } from '@midnight-ntwrk/testkit-js';

const walletAdapter = new DAppConnectorWalletAdapter(walletProvider);
const initialAPI = new DAppConnectorInitialAPI(walletAdapter, expectedNetworkId);

// Use with dapp-connector-proof-provider in e2e tests
const proofProvider = await dappConnectorProofProvider(walletAdapter, zkConfigProvider, costModel);
```
