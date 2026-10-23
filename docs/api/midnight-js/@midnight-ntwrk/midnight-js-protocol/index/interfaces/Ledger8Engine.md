[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

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

[EraSeam](../../documents/EraSeam.md)

## Methods

### executeCircuit()

> **executeCircuit**\<`C`, `PS`\>(`options`): `Promise`\<[`TranscriptPojo`](TranscriptPojo.md)\>

Runs one circuit against the decoded contract state the chain serves.

Takes the state and the balances beside it as ONE value -- see
[RunRetainedCircuitOptions.contractState](RunRetainedCircuitOptions.md#contractstate) -- because the balances a
circuit reads do not live inside the primary state, and two separate
options could describe two different blocks.

#### Type Parameters

##### C

`C` *extends* [`RetainedContract`](RetainedContract.md)

##### PS

`PS`

#### Parameters

##### options

[`RunRetainedCircuitOptions`](RunRetainedCircuitOptions.md)\<`C`, `PS`\>

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

`C` *extends* [`RetainedContract`](RetainedContract.md)

##### PS

`PS`

#### Parameters

##### options

[`RunRetainedConstructorOptions`](RunRetainedConstructorOptions.md)\<`C`, `PS`\>

#### Returns

`Promise`\<[`ConstructorResultPojo`](ConstructorResultPojo.md)\>

#### Throws

ComposeOptionError Naming option `'signingKey'` when a supplied key
  is not the 32 bytes of hex the retained runtime reads.

#### Throws

ComposeFailedError At stage `'deploy-verifier-key-blob'` when the
  ledger refuses the bytes served for a circuit.

***

### reexpressOperationsForCurrentEra()

> **reexpressOperationsForCurrentEra**(`entryPoints`): `Uint8Array`

Re-expresses a retained-era contract's entry points as a current-era contract state, so a
keep-state call has an operation registry the current composer can read.

Fork-crossing work, which is why it sits here rather than on either era facade: the input is
what the retained decoder read off the chain, and the output is for the current ledger.

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
