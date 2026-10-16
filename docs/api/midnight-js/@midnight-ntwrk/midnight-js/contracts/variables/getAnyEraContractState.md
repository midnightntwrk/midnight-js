[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / getAnyEraContractState

# Variable: getAnyEraContractState

> `const` **getAnyEraContractState**: (`publicDataProvider`, `contractAddress`) => `Promise`\<[`AnyEraContractState`](../interfaces/AnyEraContractState.md) \| `null`\>

Fetches a contract's public state and decodes it with the era that wrote it, whichever that is.

Use this wherever a contract may predate the ledger fork and the decoded state is needed in both
eras. `queryContractState` and its siblings decode only a v9 state and hand a v8 one on as the
stored bytes; this reads the era off the state's own envelope and decodes it with that era's
runtime, so a contract deployed before the fork and not yet written to still reads.

The read is relative to the network head. There is no block selector, so a historical read goes
through `queryRawContractState` directly.

The retained-era runtime is acquired only when an envelope calls for it, and — once acquired
successfully — reused for the life of the process. See `loadLedgerEra`.

## Parameters

### publicDataProvider

[`AnyEraContractStateReadSurface`](../type-aliases/AnyEraContractStateReadSurface.md)

The provider to read the raw contract state through.

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

The ledger address of the contract.

## Returns

`Promise`\<[`AnyEraContractState`](../interfaces/AnyEraContractState.md) \| `null`\>

The decoded state, or `null` when the read surface reports no contract at
`contractAddress`.

## Throws

InvalidArgumentError if `contractAddress` is not a well-formed contract address.

## Throws

TagParseError if the served payload carries no supported contract-state envelope.

## Throws

StateDecodeFailedError if the envelope's own era cannot read the state behind it.

## Throws

StateInconsistentError if the decoded state is internally inconsistent.

## Throws

Ledger8RuntimeMissingError if the state carries a retained-era envelope and that runtime
cannot be acquired — the everyday case being a build that does not ship it.

## Throws

whatever `queryRawContractState` throws, unchanged.
