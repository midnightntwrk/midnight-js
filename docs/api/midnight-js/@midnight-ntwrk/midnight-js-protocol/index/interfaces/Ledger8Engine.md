[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8Engine

# Interface: Ledger8Engine

The public surface createLedger8Engine builds: the retained pre-fork
EXECUTION capabilities.

The two execution members are ASYNCHRONOUS. They used to be synchronous, and
the docblock here used to promise it: compact-js builds a circuit call on
`Effect.tryPromise`, so `runSync` cannot discharge it and the promise is not
satisfiable. Nothing else about the surface changed shape -- every value
crossing it is still plain data or an era handle, and no `Effect` reaches a
caller.

## See

[EraBoundary](../../documents/EraBoundary.md)

## Methods

### composeMaintenanceTx()

> **composeMaintenanceTx**(`request`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Composes an UNPROVEN v8 transaction carrying one maintenance update --
insert a verifier key, remove one, or replace the maintenance authority --
built and signed by compact-js's ledger 8 `ContractExecutable`.

ASYNCHRONOUS for the same reason [Ledger8Engine.executeCircuit](#executecircuit) is.
Reads the FULL state off the bytes the chain holds, and refuses a signing
key other than the committee's first member before anything is signed.

#### Parameters

##### request

`Ledger8MaintenanceRequest`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Throws

ComposeOptionError Naming `'networkId'`, `'ttl'`, `'signingKey'`,
  `'newSigningKey'` or `'contractStateBytes'` when that option is unusable.

#### Throws

MaintenanceAuthorityMismatchError When the signing key is not the
  committee's first member.

#### Throws

ComposeFailedError At stage `'maintenance-update'` when compact-js
  refuses to build or sign the update.

***

### executeCircuit()

> **executeCircuit**\<`C`, `PS`\>(`options`): `Promise`\<[`TranscriptPojo`](TranscriptPojo.md)\>

Runs one circuit against the decoded contract state the chain serves.

Takes the state and the balances beside it as ONE value -- see
[Ledger8CircuitOptions.contractState](Ledger8CircuitOptions.md#contractstate) -- because the balances a
circuit reads do not live inside the primary state, and two separate
options could describe two different blocks.

#### Type Parameters

##### C

`C` *extends* [`Ledger8EngineContract`](Ledger8EngineContract.md)

##### PS

`PS`

#### Parameters

##### options

[`Ledger8CircuitOptions`](Ledger8CircuitOptions.md)\<`C`, `PS`\>

#### Returns

`Promise`\<[`TranscriptPojo`](TranscriptPojo.md)\>

#### Throws

DownConvertFailedError At stage `'state down-convert'` when the
  state cannot be decoded, does not re-encode to its source, or carries a
  balance the retained runtime cannot read.

#### Throws

InvalidArgumentError When the contract declares no circuit of that name.

***

### executeConstructor()

> **executeConstructor**\<`C`, `PS`\>(`options`): `Promise`\<[`ConstructorResultPojo`](ConstructorResultPojo.md)\>

Runs one retained-era constructor and returns the state it built.

ASYNCHRONOUS for the same reason [Ledger8Engine.executeCircuit](#executecircuit) is.
Stricter than the leg it replaced: compact-js registers a verifier key
against every declared entry point and refuses a missing one, where the
hand-written constructor left every slot blank.

#### Type Parameters

##### C

`C` *extends* [`Ledger8EngineContract`](Ledger8EngineContract.md)

##### PS

`PS`

#### Parameters

##### options

[`Ledger8ConstructorOptions`](Ledger8ConstructorOptions.md)\<`C`, `PS`\>

#### Returns

`Promise`\<[`ConstructorResultPojo`](ConstructorResultPojo.md)\>

#### Throws

ComposeOptionError Naming option `'signingKey'` when a supplied key
  is not the 32 bytes of hex the retained runtime reads.

#### Throws

ComposeFailedError At stage `'deploy-verifier-key-blob'` when the
  ledger refuses the bytes served for a circuit.

***

### reexpressOperationsForLedger9()

> **reexpressOperationsForLedger9**(`entryPoints`): `Uint8Array`

Re-expresses a ledger 8 contract's entry points as a ledger 9 contract state, so a
keep-state call has an operation registry the ledger 9 composer can read.

Fork-crossing work, which is why it sits here rather than on either era facade: the input is
what the ledger 8 decoder read off the chain, and the output is for ledger 9.

#### Parameters

##### entryPoints

readonly [`ContractEntryPointPojo`](ContractEntryPointPojo.md)[]

#### Returns

`Uint8Array`

***

### wrapKeepStateCall()

> **wrapKeepStateCall**(`options`): [`ContractCallPrototype`](https://github.com/midnightntwrk/midnight-ledger)

#### Parameters

##### options

[`WrapKeepStateCallOptions`](WrapKeepStateCallOptions.md)

#### Returns

[`ContractCallPrototype`](https://github.com/midnightntwrk/midnight-ledger)
