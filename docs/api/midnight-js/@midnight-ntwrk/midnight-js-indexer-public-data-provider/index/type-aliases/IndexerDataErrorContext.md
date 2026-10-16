[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerDataErrorContext

# Type Alias: IndexerDataErrorContext

> **IndexerDataErrorContext** = \{ `kind`: `"unknown-status"`; `value`: `string`; \} \| \{ `kind`: `"missing-head-block"`; \} \| \{ `kind`: `"undated-state"`; \} \| \{ `kind`: `"malformed-state-encoding"`; \} \| \{ `kind`: `"malformed-transaction-encoding"`; \} \| \{ `contractAddress`: `string`; `kind`: `"missing-contract-action"`; \} \| \{ `actionIndex`: `number`; `contractAddress`: `string`; `identifiersLength`: `number`; `kind`: `"missing-identifier"`; \} \| \{ `kind`: `"unknown-event-type"`; `typename`: `string`; \} \| \{ `field`: `string`; `kind`: `"missing-event-field"`; `typename`: `string`; \} \| \{ `field`: `string`; `kind`: `"unknown-address-kind"`; `typename`: `string`; `value`: `string`; \} \| \{ `envelopeVersion`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); `kind`: `"era-disagreement"`; `protocolVersion`: `number`; `reportedVersion`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); \} \| \{ `kind`: `"unsupported-decode-era"`; `version`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); \} \| \{ `kind`: `"malformed-parameters-encoding"`; \} \| \{ `kind`: `"unsupported-parameters-era"`; `version`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); \} \| \{ `kind`: `"mixed-era-public-states"`; `parametersVersion`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); `stateVersion`: [`LedgerVersion`](../../../midnight-js/type-aliases/LedgerVersion.md); \} \| \{ `kind`: `"malformed-protocol-version"`; `protocolVersion`: `number`; \}

Discriminated context describing the specific way indexer-returned data
failed to satisfy the provider's expectations. The `kind` tag lets
consumers branch on the failure mode without parsing the error message.
