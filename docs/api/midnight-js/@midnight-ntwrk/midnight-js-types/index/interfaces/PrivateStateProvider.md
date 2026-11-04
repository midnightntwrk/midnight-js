[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PrivateStateProvider

# Interface: PrivateStateProvider\<PSI, PS\>

Interface for a typed key-valued store containing contract private states and
contract signing keys.

Private states are reached per contract, through [PrivateStateProvider.forContract](#forcontract).
Every method compares contract addresses in lower case.

## Type Parameters

### PSI

`PSI` *extends* [`PrivateStateId`](../type-aliases/PrivateStateId.md) = [`PrivateStateId`](../type-aliases/PrivateStateId.md)

Parameter indicating the private state ID, sometimes a union of string literals.

### PS

`PS` = `any`

Parameter indicating the private state type stored, sometimes a union of private state types.

## Methods

### clearAll()

> **clearAll**(): `Promise`\<`void`\>

Remove the private states of every contract in this provider's storage.
Signing keys are not touched; see [PrivateStateProvider.clearSigningKeys](#clearsigningkeys).

#### Returns

`Promise`\<`void`\>

***

### clearSigningKeys()

> **clearSigningKeys**(): `Promise`\<`void`\>

Remove all contract signing keys.

#### Returns

`Promise`\<`void`\>

***

### exportSigningKeys()

> **exportSigningKeys**(`options?`): `Promise`\<[`SigningKeyExport`](SigningKeyExport.md)\>

Export all signing keys as an encrypted JSON-serializable structure.

#### Parameters

##### options?

[`ExportSigningKeysOptions`](ExportSigningKeysOptions.md)

Export options including optional custom password and key limit.

#### Returns

`Promise`\<[`SigningKeyExport`](SigningKeyExport.md)\>

A JSON-serializable export structure that can be saved or transmitted.

#### Throws

If no keys exist to export, the key limit
  is exceeded, or a caller-supplied `options.password` does not satisfy
  the minimum-length policy.

#### Throws

If the password returned by the configured password provider
  does not satisfy the minimum strength policy (validation runs on
  every invocation).

#### Throws

If reading existing entries fails for any of the reasons listed
  on [PrivateStateProvider.getSigningKey](#getsigningkey).

***

### forContract()

> **forContract**(`contractAddress`): [`ContractPrivateStates`](ContractPrivateStates.md)\<`PSI`, `PS`\>

Return the private states of the contract at the given address.

The view is cheap to create and holds no I/O resources. The address is
compared in lower case, so `'AB…'` and `'ab…'` reach the same states.

#### Parameters

##### contractAddress

`string`

The address of the contract whose private states the view reaches.

#### Returns

[`ContractPrivateStates`](ContractPrivateStates.md)\<`PSI`, `PS`\>

A view whose operations always use `contractAddress`.

#### Throws

If `contractAddress` is not a valid contract address.

***

### getSigningKey()

> **getSigningKey**(`address`): `Promise`\<[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

Retrieve the signing key for a contract.

#### Parameters

##### address

`string`

The address of the contract for which to get the signing key.

#### Returns

`Promise`\<[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger) \| `null`\>

The stored signing key, or `null` if either:
  - no signing key is stored for the given address, or
  - the stored value deserializes to `undefined`.

  Callers should treat both `null` outcomes equivalently as "no usable
  value".

#### Throws

If the password returned by the configured password provider does
  not satisfy the minimum strength policy. Validation runs on every
  invocation against the password returned by the provider — it is not
  cached.

#### Throws

If decryption of the stored value fails (wrong password, salt
  mismatch, unsupported encryption version, or authentication tag
  mismatch). Decryption errors are propagated to the caller and do **not**
  collapse to `null`.

#### Throws

If a concurrent password rotation does not release its lock
  within the internal default timeout (5 minutes on the read path; the
  read path does not expose a configuration knob).

#### Throws

Underlying store I/O errors are propagated; callers should not
  include them in user-facing messages without redacting paths and
  OS-level metadata.

#### Remarks

Implementations may lazily migrate legacy or unencrypted entries on
read, which means a successful logical read can trigger a write to the
underlying store. In read-only environments, `getSigningKey` may reject
with an I/O error even when the value is present and decryptable. The
list of decryption failure modes above is illustrative, not exhaustive
— payload encoding/parse errors, crypto-backend availability errors,
and other corruption modes are also surfaced as throws rather than
`null`.

***

### importSigningKeys()

> **importSigningKeys**(`exportData`, `options?`): `Promise`\<[`ImportSigningKeysResult`](ImportSigningKeysResult.md)\>

Import signing keys from a previously exported structure.

#### Parameters

##### exportData

[`SigningKeyExport`](SigningKeyExport.md)

The export data structure to import.

##### options?

[`ImportSigningKeysOptions`](ImportSigningKeysOptions.md)

Import options including password, conflict strategy, and key limit.

#### Returns

`Promise`\<[`ImportSigningKeysResult`](ImportSigningKeysResult.md)\>

Result indicating how many keys were imported/skipped/overwritten.

#### Throws

If decryption fails (wrong password or corrupted data).

#### Throws

If the export format is invalid or unsupported.

#### Throws

If conflictStrategy is 'error' and conflicts exist.

#### Throws

If a caller-supplied `options.password`
  does not satisfy the minimum-length policy.

#### Throws

If reading or writing the underlying store fails for any of the
  reasons listed on [PrivateStateProvider.getSigningKey](#getsigningkey) or
  [PrivateStateProvider.setSigningKey](#setsigningkey).

***

### removeSigningKey()

> **removeSigningKey**(`address`): `Promise`\<`void`\>

Remove the signing key for a contract.

#### Parameters

##### address

`string`

The address of the contract for which to delete the signing key.

#### Returns

`Promise`\<`void`\>

***

### setSigningKey()

> **setSigningKey**(`address`, `signingKey`): `Promise`\<`void`\>

Store the given signing key at the given address.

#### Parameters

##### address

`string`

The address of the contract having the given signing key.

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to store.

#### Returns

`Promise`\<`void`\>
