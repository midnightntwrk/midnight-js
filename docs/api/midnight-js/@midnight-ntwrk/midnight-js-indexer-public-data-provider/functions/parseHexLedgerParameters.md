[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / parseHexLedgerParameters

# Function: parseHexLedgerParameters()

> **parseHexLedgerParameters**(`s`): [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

Decodes the ledger parameters of one block, after establishing which ledger runtime wrote them —
and only if that runtime is one this path can decode.

The dating step is not defence in depth here, it is the whole function: parameters are era-tagged
exactly as a contract state is (`ledger-parameters[v5]` from the retained runtime,
`[v8]` from the current one), each era's deserializer refuses the other's bytes on the header tag,
and the indexer serves them PER BLOCK — so every pre-fork block a caller reads carries parameters
this era cannot decode.

A retained-era block is an ordinary thing to read, not a fault; see
[IndexerDataError.unsupportedParametersEra](../classes/IndexerDataError.md#unsupportedparametersera) for what a caller does about it, and
`docs/architecture/era-tagged-payload-decoders.md` for why this defect class keeps recurring.

## Parameters

### s

`string`

The hex-encoded serialized ledger parameters, as the indexer serves them.

## Returns

[`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

## Throws

When the payload is not hex-encoded, or its era is not decodable here.

## Throws

When the payload carries no supported ledger-parameters envelope.

## Throws

When the envelope is decodable but the body behind it is not.
