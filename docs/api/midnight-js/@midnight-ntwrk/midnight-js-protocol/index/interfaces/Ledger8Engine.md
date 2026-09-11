[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8Engine

# Interface: Ledger8Engine

The public surface createLedger8Engine builds: the retained pre-fork
EXECUTION capabilities, with the 0.16 runtime instance already captured in
closure — no method here takes a runtime or module parameter.

Every method is synchronous: this object is handed over only after the
retained toolchain has been acquired.

## See

[EraSeam](../../documents/EraSeam.md)

## Methods

### downConvertForExecution()

> **downConvertForExecution**(`state`): [`DownConvertedState`](DownConvertedState.md)

#### Parameters

##### state

[`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

#### Returns

[`DownConvertedState`](DownConvertedState.md)

***

### executeCircuit()

> **executeCircuit**(`options`): [`TranscriptPojo`](TranscriptPojo.md)

#### Parameters

##### options

[`ExecuteCircuitOptions`](ExecuteCircuitOptions.md)

#### Returns

[`TranscriptPojo`](TranscriptPojo.md)

***

### executeConstructor()

> **executeConstructor**(`options`): [`ConstructorResultPojo`](ConstructorResultPojo.md)

#### Parameters

##### options

[`ExecuteConstructorOptions`](ExecuteConstructorOptions.md)

#### Returns

[`ConstructorResultPojo`](ConstructorResultPojo.md)

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
