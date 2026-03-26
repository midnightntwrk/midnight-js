# TestConnectedWallet — dapp-connector-api Implementation for Testing

**Goal:** Implement `ConnectedAPI` and `InitialAPI` (from `@midnight-ntwrk/dapp-connector-api`) in testkit-js, enabling dApps to use a programmatic wallet for e2e testing without a real browser wallet.

**Location:** `testkit-js/testkit-js/src/wallet/`

**Tech Stack:** TypeScript, vitest, ledger-v8, wallet-sdk-facade, wallet-sdk-address-format

---

## Problem

DApps interact with wallets through `ConnectedAPI`. The testkit has `MidnightWalletProvider` which implements the internal `WalletProvider` + `MidnightProvider` interfaces, but not `ConnectedAPI`. This means:

- DApps cannot e2e test their wallet integration without a real browser wallet
- The planned `wallet-adapter` bridge (`ConnectedAPI` → `WalletProvider`/`MidnightProvider`) has no testable `ConnectedAPI` implementation
- Test setups require different provider wiring depending on whether testing with a real wallet or programmatically

## Solution

Two classes that wrap `MidnightWalletProvider` to expose the dapp-connector-api interfaces:

### `TestConnectedWallet` (implements `ConnectedAPI`)

Wraps an already-started `MidnightWalletProvider` + `EnvironmentConfiguration`.

### `TestWalletInitialAPI` (implements `InitialAPI`)

Thin wrapper providing wallet metadata + `connect(networkId)` that validates the network and returns the `TestConnectedWallet`.

---

## Architecture

```
MidnightWalletProvider (existing)
  ├── WalletFacade (shielded + unshielded + dust)
  ├── ZswapSecretKeys
  ├── DustSecretKey
  ├── UnshieldedKeystore
  └── EnvironmentConfiguration
         │
         ▼
TestConnectedWallet (new) ── implements ConnectedAPI
  │   Handles: hex serialization, Bech32m encoding,
  │   delegation to WalletFacade methods
  │
  ▼
TestWalletInitialAPI (new) ── implements InitialAPI
      Handles: wallet metadata, connect(networkId) validation
```

### No lifecycle management

`TestConnectedWallet` does NOT manage `start()`/`stop()`. The caller builds and starts `MidnightWalletProvider` first (as they already do in tests), then wraps it.

---

## File Structure

```
testkit-js/testkit-js/src/wallet/
├── ...existing files...
├── test-connected-wallet.ts          # ConnectedAPI implementation
├── test-wallet-initial-api.ts        # InitialAPI implementation
└── index.ts                          # Updated exports
```

---

## Class: TestConnectedWallet

### Constructor

```typescript
constructor(
  walletProvider: MidnightWalletProvider,
  environmentConfiguration: EnvironmentConfiguration
)
```

Internally accesses from `walletProvider`:
- `wallet` (WalletFacade) — balancing, submitting, state observables
- `zswapSecretKeys` (ZswapSecretKeys) — coin/encryption public keys
- `dustSecretKey` (DustSecretKey) — dust address
- `unshieldedKeystore` (UnshieldedKeystore) — signing, unshielded address
- `env` (EnvironmentConfiguration) — network config

### Method Implementations

#### Address methods

**`getShieldedAddresses()`**
1. Get `ShieldedWalletState` from `walletFacade.shielded.state` (take first emission via RxJS `firstValueFrom`)
2. `state.address` → `ShieldedAddress` object
3. Encode to Bech32m (note: `ShieldedAddress` implements `HasCodec` so uses generic encode; `ShieldedCoinPublicKey` and `ShieldedEncryptionPublicKey` require their static `codec` directly):
   - `MidnightBech32m.encode(walletNetworkId, address).asString()` → `shieldedAddress`
   - `ShieldedCoinPublicKey.codec.encode(walletNetworkId, state.coinPublicKey).asString()` → `shieldedCoinPublicKey`
   - `ShieldedEncryptionPublicKey.codec.encode(walletNetworkId, state.encryptionPublicKey).asString()` → `shieldedEncryptionPublicKey`

**`getUnshieldedAddress()`**
- `unshieldedKeystore.getBech32Address().asString()` → `{ unshieldedAddress }`

**`getDustAddress()`**
- `DustAddress.encodePublicKey(networkId, dustSecretKey.publicKey)` → `{ dustAddress }`

#### Balance methods

**`getShieldedBalances()`**
- `firstValueFrom(walletFacade.shielded.state)` → `state.balances` → `Record<RawTokenType, bigint>`
- `RawTokenType` from ledger-v8 is a hex string. `TokenType` from dapp-connector-api is also `string` (hex-encoded). Compatibility needs verification during implementation — if formats differ, a mapping layer is needed.

**`getUnshieldedBalances()`**
- Same pattern from `walletFacade.unshielded.state`

**`getDustBalance()`**
- `firstValueFrom(walletFacade.dust.state)` → `DustWalletState`
- `balance`: `state.balance(new Date())` returns `bigint` (current dust balance)
- `cap`: derived from `state.availableCoinsWithFullInfo(new Date())` — sum the `maxCap` values from `DustGenerationDetails` across all dust coins to compute the maximum dust generation capacity
- Return `{ cap, balance }`

#### Transaction methods

**`balanceUnsealedTransaction(hex, options?)`**
1. `fromHex(hex)` → `Uint8Array`
2. `Transaction.deserialize('signature', 'proof', 'pre-binding', bytes)` → `UnboundTransaction`
3. `walletFacade.balanceUnboundTransaction(tx, { shieldedSecretKeys, dustSecretKey }, { ttl })` → recipe
4. `walletFacade.signRecipe(recipe, (payload) => unshieldedKeystore.signData(payload))` → signed
5. `walletFacade.finalizeRecipe(signed)` → `FinalizedTransaction`
6. `toHex(result.serialize())` → return `{ tx: hex }`

`options.payFees` (default `true`) mapping: when `true` (or omitted), pass `tokenKindsToBalance: 'all'` to the facade (balance all token kinds including dust for fees). When `false`, pass `tokenKindsToBalance: ['shielded', 'unshielded']` to exclude dust fee payment. TTL defaults to `ttlOneHour()` from `@midnight-ntwrk/midnight-js-utils`.

**`balanceSealedTransaction(hex, options?)`**
1. `fromHex(hex)` → `Uint8Array`
2. `Transaction.deserialize('signature', 'proof', 'binding', bytes)` → `FinalizedTransaction`
3. `walletFacade.balanceFinalizedTransaction(tx, { shieldedSecretKeys, dustSecretKey }, { ttl })` → `FinalizedTransactionRecipe`
4. `walletFacade.signRecipe(recipe, (payload) => unshieldedKeystore.signData(payload))` → signed
5. `walletFacade.finalizeRecipe(signed)` → `FinalizedTransaction`
6. `toHex(result.serialize())` → return `{ tx: hex }`

Same `payFees` → `tokenKindsToBalance` mapping as unsealed variant.

**`submitTransaction(hex)`**
1. `fromHex(hex)` → `Transaction.deserialize('signature', 'proof', 'binding', bytes)`
2. `walletFacade.submitTransaction(tx)` (returned `TransactionIdentifier` string is discarded)
3. Return `void` (matches `ConnectedAPI` contract)

#### signData

**`signData(data, options)`**
1. Decode `data` based on `options.encoding`:
   - `'hex'` → `fromHex(data)`
   - `'base64'` → `Buffer.from(data, 'base64')`
   - `'text'` → `new TextEncoder().encode(data)`
2. `unshieldedKeystore.signData(decoded)` → `Signature` (string)
3. `unshieldedKeystore.getPublicKey()` → `SignatureVerifyingKey` (string)
4. Return `{ data, signature, verifyingKey }`

#### getProvingProvider

**`getProvingProvider(keyMaterialProvider)`**
Returns a `ProvingProvider` that delegates to the ledger WASM implementation:
```typescript
{
  async check(serializedPreimage, keyLocation) {
    // Load ZKIR and verifier key via keyMaterialProvider
    // Delegate to ledger WASM check
  },
  async prove(serializedPreimage, keyLocation, overwriteBindingInput?) {
    // Load ZKIR and prover key via keyMaterialProvider
    // Delegate to ledger WASM prove
  }
}
```

#### Configuration and status

**`getConfiguration()`**
```typescript
{
  indexerUri: env.indexer,
  indexerWsUri: env.indexerWS,
  substrateNodeUri: env.node,
  proverServerUri: env.proofServer,  // @deprecated in ConnectedAPI, but populated for backwards compat
  networkId: env.networkId
}
```

**`getConnectionStatus()`** → `{ status: 'connected', networkId: env.networkId }`

**`hintUsage(methodNames)`** → accepts `Array<keyof WalletConnectedAPI>`, ignores the parameter, resolves immediately

#### Stubbed methods

`makeTransfer()`, `makeIntent()`, `getTxHistory()` throw `Error('Not implemented in TestConnectedWallet')`.

---

## Class: TestWalletInitialAPI

### Constructor

```typescript
constructor(
  connectedWallet: TestConnectedWallet,
  options?: {
    rdns?: string;
    name?: string;
    icon?: string;
    apiVersion?: string;
  }
)
```

### Properties

| Property | Default |
|----------|---------|
| `rdns` | `'com.midnight.test-wallet'` |
| `name` | `'Test Wallet'` |
| `icon` | `'data:image/svg+xml,<svg/>'` |
| `apiVersion` | matches installed dapp-connector-api version |

### Methods

**`connect(networkId)`**
- Validates `networkId` matches `environmentConfiguration.networkId` (the string variant)
- Throws if mismatch (simulates wallet refusing connection to wrong network)
- Returns the `TestConnectedWallet` instance

---

## Serialization Details

### Hex ↔ bytes

Uses `toHex` / `fromHex` from `@midnight-ntwrk/midnight-js-utils`.

### Transaction deserialization markers

| ConnectedAPI method | Marker S | Marker P | Marker B |
|---|---|---|---|
| `balanceUnsealedTransaction` | `'signature'` | `'proof'` | `'pre-binding'` |
| `balanceSealedTransaction` | `'signature'` | `'proof'` | `'binding'` |
| `submitTransaction` | `'signature'` | `'proof'` | `'binding'` |

### Address encoding

Uses `@midnight-ntwrk/wallet-sdk-address-format`. Encoding varies by type:

| Address type | Encoding method |
|---|---|
| `ShieldedAddress` | `MidnightBech32m.encode(walletNetworkId, address).asString()` — implements `HasCodec` |
| `ShieldedCoinPublicKey` | `ShieldedCoinPublicKey.codec.encode(walletNetworkId, key).asString()` — static codec |
| `ShieldedEncryptionPublicKey` | `ShieldedEncryptionPublicKey.codec.encode(walletNetworkId, key).asString()` — static codec |
| Unshielded address | `unshieldedKeystore.getBech32Address().asString()` — already encoded by keystore |
| Dust address | `DustAddress.encodePublicKey(networkId, publicKey)` — returns string directly |

### NetworkId usage

`EnvironmentConfiguration` has two network ID fields:
- `walletNetworkId: NetworkId.NetworkId` — used for Bech32m address encoding (passed to `MidnightBech32m.encode` and static codecs)
- `networkId: string` — used for `getConfiguration()` response, `connect()` validation, and `DustAddress.encodePublicKey`

`DustAddress.encodePublicKey` accepts `networkId: string`, so uses `env.networkId`.

---

## Dependencies

### New dependencies for testkit-js

- `@midnight-ntwrk/dapp-connector-api` — `ConnectedAPI`, `InitialAPI` types
- `@midnight-ntwrk/wallet-sdk-address-format` — `MidnightBech32m`, `ShieldedAddress`, `DustAddress`, etc. (already transitively available via other deps, but must be added as a direct dependency since testkit-js imports from it directly)

### Already available in testkit-js

- `@midnight-ntwrk/ledger-v8` — `Transaction`, `DustSecretKey`, `ZswapSecretKeys`
- `@midnight-ntwrk/wallet-sdk-facade` — `WalletFacade`
- `@midnight-ntwrk/wallet-sdk-unshielded-wallet` — `UnshieldedKeystore`
- `@midnight-ntwrk/midnight-js-utils` — `toHex`, `fromHex`
- `rxjs` — `firstValueFrom`

---

## Testing Strategy

### Unit tests (TDD, vitest)

**TestWalletInitialAPI:**
- `connect()` returns `ConnectedAPI` when networkId matches
- `connect()` throws when networkId mismatches
- Properties have correct defaults
- Custom properties override defaults

**TestConnectedWallet — address methods:**
- `getShieldedAddresses()` returns Bech32m-encoded strings
- `getUnshieldedAddress()` returns Bech32m-encoded string
- `getDustAddress()` returns Bech32m-encoded string

**TestConnectedWallet — transaction methods:**
- `balanceUnsealedTransaction()` deserializes hex, calls walletFacade, returns hex
- `balanceSealedTransaction()` same for sealed variant
- `submitTransaction()` deserializes and submits

**TestConnectedWallet — signData:**
- Decodes hex-encoded input correctly
- Decodes base64-encoded input correctly
- Decodes text-encoded input correctly
- Returns signature and verifying key

**TestConnectedWallet — getProvingProvider:**
- Returns an object with `check` and `prove` methods
- Delegates to ledger WASM via the provided `keyMaterialProvider`

**TestConnectedWallet — other:**
- `getConfiguration()` maps EnvironmentConfiguration correctly
- `getConnectionStatus()` returns connected
- `hintUsage(methodNames)` accepts array and resolves without error
- Stubbed methods throw

### Integration test (e2e)

Full round-trip: `TestConnectedWallet` → `createWalletAndMidnightProvider` (wallet-adapter) → deploy + call contract. This validates the real serialization path with actual ledger types.

---

## Usage Examples

### In testkit e2e tests

```typescript
const testEnvironment = getTestEnvironment(logger);
const envConfig = await testEnvironment.start();
const walletProvider = await testEnvironment.getMidnightWalletProvider();
await walletProvider.start();

const connectedWallet = new TestConnectedWallet(walletProvider, envConfig);
const initialAPI = new TestWalletInitialAPI(connectedWallet);
const connectedAPI = await initialAPI.connect(envConfig.networkId);

const addresses = await connectedAPI.getShieldedAddresses();
const config = await connectedAPI.getConfiguration();
```

### In dApp e2e tests

```typescript
const connectedAPI = await initialAPI.connect('testnet');

// DApp's existing provider setup works unchanged
const { walletProvider, midnightProvider, shieldedAddress } =
  await createWalletAndMidnightProvider(connectedAPI);

const providers = {
  walletProvider,
  midnightProvider,
  privateStateProvider: levelPrivateStateProvider({ accountId: shieldedAddress.shieldedAddress }),
  publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
  // ...
};
```

### Browser test simulation

```typescript
const initialAPI = new TestWalletInitialAPI(connectedWallet);
window.midnight = { 'com.midnight.test-wallet': initialAPI };
// DApp's wallet discovery code finds and connects to test wallet
```

---

## Open Questions

1. **wallet-sdk-address-format version:** Need to verify which version is compatible with the current monorepo and add to testkit-js dependencies.

2. **getProvingProvider implementation detail:** The exact ledger WASM API for circuit-level check/prove needs verification during implementation. The `KeyMaterialProvider` → `ProvingProvider` bridge may need a small adapter.

3. **RawTokenType ↔ TokenType compatibility:** Verify during implementation that ledger-v8's `RawTokenType` format matches dapp-connector-api's `TokenType` (both hex strings). If formats differ, add a mapping layer.
