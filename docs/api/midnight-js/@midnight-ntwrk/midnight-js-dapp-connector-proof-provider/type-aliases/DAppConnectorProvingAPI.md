[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](../README.md) / DAppConnectorProvingAPI

# Type Alias: DAppConnectorProvingAPI

> **DAppConnectorProvingAPI** = `Pick`\<`WalletConnectedAPI`, `"getProvingProvider"`\>

Minimal interface required from the DApp Connector wallet.

## Remarks

Picks only WalletConnectedAPI.getProvingProvider \| getProvingProvider from the full
wallet API, allowing loose coupling between the framework and the wallet implementation.
