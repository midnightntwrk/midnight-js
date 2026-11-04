[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ContractPrivateStates

# Interface: ContractPrivateStates\<PSI, PS\>

The private states of one contract, reached through
[PrivateStateProvider.forContract](PrivateStateProvider.md#forcontract).

The contract address is fixed when the view is created, so views for different
contracts never interfere, even when their operations run concurrently.

## Type Parameters

### PSI

`PSI` *extends* [`PrivateStateId`](../type-aliases/PrivateStateId.md) = [`PrivateStateId`](../type-aliases/PrivateStateId.md)

Parameter indicating the private state ID, sometimes a union of string literals.

### PS

`PS` = `any`

Parameter indicating the private state type stored, sometimes a union of private state types.

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract this view reaches, in lower case.

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

Remove all private states of this contract. Other contracts are not touched.

#### Returns

`Promise`\<`void`\>

***

### exportPrivateStates()

> **exportPrivateStates**(`options?`): `Promise`\<[`PrivateStateExport`](PrivateStateExport.md)\>

Export this contract's private states as an encrypted JSON-serializable structure.

Signing keys are not exported.

#### Parameters

##### options?

[`ExportPrivateStatesOptions`](ExportPrivateStatesOptions.md)

Export options including optional custom password and state limit.

#### Returns

`Promise`\<[`PrivateStateExport`](PrivateStateExport.md)\>

A JSON-serializable export structure that can be saved or transmitted.

#### Throws

If no states exist to export, the state
  limit is exceeded, or a caller-supplied `options.password` does not
  satisfy the minimum-length policy.

#### Throws

If the password returned by the configured password provider
  does not satisfy the minimum strength policy (validation runs on
  every invocation).

#### Throws

If reading existing entries fails for any of the reasons listed
  on [ContractPrivateStates.get](#get) (decryption failure, rotation
  lock timeout, store I/O).

***

### get()

> **get**(`privateStateId`): `Promise`\<`PS` \| `null`\>

Retrieve the private state at the given private state ID.

#### Parameters

##### privateStateId

`PSI`

The private state identifier.

#### Returns

`Promise`\<`PS` \| `null`\>

The stored private state, or `null` if either:
  - the key is absent from the underlying store, or
  - the stored value deserializes to `undefined`.

  Callers should treat both `null` outcomes equivalently as "no usable
  value". The provider does not distinguish between an absent key and an
  explicitly-undefined stored value; if the distinction matters for your
  application, store a sentinel value instead.

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
underlying store. In read-only environments (mounted-read-only file
systems, quota-exhausted backends), `get` may reject with an I/O error
even when the value is present and decryptable. The list of decryption
failure modes above is illustrative, not exhaustive — payload
encoding/parse errors, crypto-backend availability errors, and other
corruption modes are also surfaced as throws rather than `null`.

***

### importPrivateStates()

> **importPrivateStates**(`exportData`, `options?`): `Promise`\<[`ImportPrivateStatesResult`](ImportPrivateStatesResult.md)\>

Import private states from a previously exported structure into this contract.

An export does not record the contract it came from: the states are written
into the contract of this view, whichever contract exported them.

#### Parameters

##### exportData

[`PrivateStateExport`](PrivateStateExport.md)

The export data structure to import.

##### options?

[`ImportPrivateStatesOptions`](ImportPrivateStatesOptions.md)

Import options including password, conflict strategy, and state limit.

#### Returns

`Promise`\<[`ImportPrivateStatesResult`](ImportPrivateStatesResult.md)\>

Result indicating how many states were imported/skipped/overwritten.

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
  reasons listed on [ContractPrivateStates.get](#get) or
  [ContractPrivateStates.set](#set).

***

### remove()

> **remove**(`privateStateId`): `Promise`\<`void`\>

Remove the value at the given private state ID.

#### Parameters

##### privateStateId

`PSI`

The private state identifier.

#### Returns

`Promise`\<`void`\>

***

### set()

> **set**(`privateStateId`, `state`): `Promise`\<`void`\>

Store the given private state at the given private state ID.

Private state must be plain data — objects, arrays and the common built-in
value types. Functions, symbols and class instances are not stored, because a
dropped member would otherwise surface much later as a missing field during
witness evaluation. Which built-ins survive depends on how an implementation
serializes, so each documents its own set.

#### Parameters

##### privateStateId

`PSI`

The private state identifier.

##### state

`PS`

The private state to store.

#### Returns

`Promise`\<`void`\>

#### Throws

If the state holds something that
        cannot be stored. Nothing is written when it does. An implementation
        that keeps state in memory by reference preserves every member and so
        does not raise it — though such a state may still lose those members
        when it is exported.
