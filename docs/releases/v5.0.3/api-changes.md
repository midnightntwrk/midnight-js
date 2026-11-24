# API Changes v5.0.3

## Added

Nothing.

## Removed

Nothing.

## Changed behaviour (no signature change)

### `httpClientProofProvider` (`@midnightntwrk/midnight-js-http-client-proof-provider`)

| Case | v5.0.2 | v5.0.3 |
|------|--------|--------|
| 3xx answer | followed, body and headers sent to the target | `ProofServerError` with the 3xx status, not retried |
| 429 answer | `ProofServerError` at once | retried up to 3 times, then `ProofServerError` |
| `Retry-After` header | ignored | used as the wait before the next retry |
| `timeout` | per request, waits between retries not covered | covers all retries and waits |

### Contract-scoped transactions (`@midnightntwrk/midnight-js-contracts`)

`withContractScopedTransaction`, `withLedger8ContractScopedTransaction` and
`withLedger9ContractScopedTransaction` no longer fail when two calls draw the same segment id (#1732).
An outer scope of an era the entry point does not know is refused (#1719); with ledger 8 and ledger 9
this cannot happen today.

## Dependencies

`@midnightntwrk/midnight-js-http-client-proof-provider` no longer depends on `fetch-retry`.
