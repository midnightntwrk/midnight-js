[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-dapp-connector-proof-provider](../README.md) / dappConnectorWalletProviders

# Function: dappConnectorWalletProviders()

> **dappConnectorWalletProviders**(`api`): `Promise`\<\{ `midnightProvider`: [`MidnightProvider`](../../midnight-js/types/interfaces/MidnightProvider.md); `walletProvider`: [`WalletProvider`](../../midnight-js/types/interfaces/WalletProvider.md); \}\>

Creates the [WalletProvider](../../midnight-js/types/interfaces/WalletProvider.md) and [MidnightProvider](../../midnight-js/types/interfaces/MidnightProvider.md) of a browser dApp from a DApp Connector
wallet, for ledger 8 and ledger 9 transactions.

## Parameters

### api

[`DAppConnectorWalletAPI`](../type-aliases/DAppConnectorWalletAPI.md)

The DApp Connector's `ConnectedAPI`, or any object with the methods in [DAppConnectorWalletAPI](../type-aliases/DAppConnectorWalletAPI.md).

## Returns

`Promise`\<\{ `midnightProvider`: [`MidnightProvider`](../../midnight-js/types/interfaces/MidnightProvider.md); `walletProvider`: [`WalletProvider`](../../midnight-js/types/interfaces/WalletProvider.md); \}\>

The wallet provider and the midnight provider, both serving `v8` and `v9`.

## Remarks

The shielded keys are read once, here. Balancing goes through `balanceUnsealedTransaction` and submission
through `submitTransaction`. The connector takes no TTL, so the `ttl` argument of `balanceTx` is not
forwarded and the wallet picks the expiry. See https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/102

A rejection from the wallet leaves these providers unchanged, with the connector's own `code`.
`deployContract` and the `callTx` functions wrap it in `ProviderFailedError`, and that copy does not keep the
connector's `code`; it keeps only this framework's own codes.

## Throws

InvalidArgumentError raised by `balanceTx` if the wallet answer is not even-length hex without a `0x`
prefix, and by `submitTx`, before anything is submitted, if the transaction has no identifier.

## Throws

PayloadNotATransactionError raised by `balanceTx` if the wallet answer is not a balanced transaction of
the requested ledger.

## Throws

Ledger8RuntimeMissingError raised by `balanceTx` on a ledger 8 request if the v8 runtime cannot be loaded.
