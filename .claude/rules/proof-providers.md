---
paths:
  - "packages/http-client-proof-provider/**"
  - "packages/dapp-connector-proof-provider/**"
---

# Proof providers

## @midnightntwrk/midnight-js-http-client-proof-provider

- HTTP communication with proof server
- Implement retry logic for transient failures
- Respect timeout configurations

## @midnightntwrk/midnight-js-dapp-connector-proof-provider

- Delegates proving to DApp Connector wallet
- Two abstraction levels: high-level (`dappConnectorProofProvider`) and low-level (`dappConnectorProvingProvider`)
- Minimal interface coupling via `Pick<WalletConnectedAPI, 'getProvingProvider'>`
- Proving provider is obtained once during setup and cached — do not re-obtain per call
- `dappConnectorWalletProviders` builds `WalletProvider` + `MidnightProvider` from `Pick<ConnectedAPI, 'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'>`, both eras; wallet errors are not wrapped here (contracts' `atProviderMethod` wraps them); `ttl` is not forwarded (connector has none)
