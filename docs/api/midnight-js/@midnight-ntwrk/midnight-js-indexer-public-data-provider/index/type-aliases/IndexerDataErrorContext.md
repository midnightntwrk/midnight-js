[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerDataErrorContext

# Type Alias: IndexerDataErrorContext

> **IndexerDataErrorContext** = \{ `kind`: `"unknown-status"`; `value`: `string`; \} \| \{ `kind`: `"missing-latest-block"`; \} \| \{ `kind`: `"undated-state"`; \} \| \{ `kind`: `"malformed-state-encoding"`; \} \| \{ `kind`: `"malformed-transaction-encoding"`; \} \| \{ `contractAddress`: `string`; `kind`: `"missing-contract-action"`; \} \| \{ `actionIndex`: `number`; `contractAddress`: `string`; `identifiersLength`: `number`; `kind`: `"missing-identifier"`; \} \| \{ `kind`: `"unknown-event-type"`; `typename`: `string`; \} \| \{ `field`: `string`; `kind`: `"missing-event-field"`; `typename`: `string`; \} \| \{ `field`: `string`; `kind`: `"unknown-address-kind"`; `typename`: `string`; `value`: `string`; \} \| \{ `kind`: `"era-disagreement"`; `protocolVersion`: `number`; `reportedVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); `stateVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); \} \| \{ `kind`: `"malformed-parameters-encoding"`; \} \| \{ `kind`: `"malformed-zswap-encoding"`; \} \| \{ `era`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); `kind`: `"malformed-zswap-state"`; \} \| \{ `kind`: `"parameters-era-disagreement"`; `parametersVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); `protocolVersion`: `number`; `reportedVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); \} \| \{ `kind`: `"mixed-era-public-states"`; `parametersVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); `stateVersion`: [`LedgerEra`](../../../midnight-js/type-aliases/LedgerEra.md); \} \| \{ `contractAddress?`: `string`; `kind`: `"malformed-protocol-version"`; `method?`: [`StateReadMethod`](../../../midnight-js/types/type-aliases/StateReadMethod.md); `protocolVersion`: `number`; \}

Discriminated context describing the specific way indexer-returned data
failed to satisfy the provider's expectations. The `kind` tag lets
consumers branch on the failure mode without parsing the error message.
