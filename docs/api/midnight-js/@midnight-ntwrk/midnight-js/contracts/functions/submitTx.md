[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitTx

# Function: submitTx()

> **submitTx**\<`PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedTxRead`](../../types/type-aliases/FinalizedTxRead.md)\>

Proves, balances, and submits an unproven deployment or call transaction using
the given providers, according to the given options.

## Which era it runs on

It reads the network's ledger version once and runs on that era. The handle's `era` must match it:

| input | network | what happens |
|---|---|---|
| v9 | v9 | proved, balanced and submitted as v9 handles |
| v8 | v8 | proved, balanced and submitted as v8 handles |
| v8 | v9 | refused with `EraMismatchError` before proving: the v9 ledger cannot read a v8 transaction |
| v9 | v8 | refused with `EraMismatchError` before proving |

The head is read before proving, not again. If the network crosses the hard fork while the
transaction is being proved, the node refuses it and the refusal arrives as
`ProviderFailedError` from `submitTx`, not as a fork diagnosis. Read the head again and rebuild
the transaction for the new era.

## Blocking Behavior

This method **waits indefinitely** for the transaction to appear on the blockchain via
`providers.publicDataProvider.watchForTxData(txId)`. It will not return until:
- The transaction is successfully included in the blockchain, OR
- An error occurs during proving, balancing, or submission

## Conditions When Transaction May Not Appear

A submitted transaction may fail to appear on-chain if:
- Transaction is invalid in ways not detected during local validation
- Network issues prevent propagation to validators
- Transaction is rejected by validator consensus
- Insufficient fees or resources
- Contract state has changed making the transaction invalid

## Implications of Aborting This Method

If the application terminates this method before it returns:
- Transaction may still be pending/processing on-chain
- **Private state updates are NOT stored** (even if transaction later succeeds on-chain)
- **Signing keys are NOT updated** (for deploy/replace authority transactions)
- Application state will be out of sync with blockchain state
- Manual recovery may be required to reconcile state

**Recommendation**: Use [submitTxAsync](submitTxAsync.md) for non-blocking submission with manual
finalization handling and timeout control.

## Type Parameters

### PCK

`PCK` *extends* `string`

## Parameters

### providers

`Omit`\<[`MidnightProviders`](../../types/interfaces/MidnightProviders.md)\<`PCK`\>, `"privateStateProvider"`\>

The providers used to manage the transaction lifecycle.

### options

[`SubmitTxOptions`](../interfaces/SubmitTxOptions.md)\<`PCK`\>

Configuration.

## Returns

`Promise`\<[`FinalizedTxRead`](../../types/type-aliases/FinalizedTxRead.md)\>

A promise that resolves with the finalized transaction data, tagged with the era of
         the head it ran on, or rejects if an error occurs along the way.

## Throws

InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package,
        before the head is read.

## Throws

EraMismatchError for a transaction whose era is not the head's.

## Throws

ProviderFailedError if a provider rejects, with its failure sanitized onto `cause`.

## Throws

EraInvariantViolationError if a provider answers in the other era, or the record's era
        differs from the head's. In the record's case the
        transaction is already on chain; its id is on `txId`.
