# Release Notes v5.0.3

**Release Date:** TBD
**Previous Version:** v5.0.2
**Node.js Requirement:** >=22.12

v5.0.3 is a patch release. It makes the HTTP proof provider retry safer, refuses proof server
redirects, and fixes a rare failure in contract-scoped transactions.
No public API is added, removed or renamed.

## Security

### Refuse proof server redirects (#1733)

Requests to the proof server (`/check`, `/prove`) followed redirects. The request body (the proving
payload) and the configured `headers` (for example an API key) were sent to the redirect target.

Now the provider does not follow redirects. A 3xx answer fails the request with `ProofServerError`
(the `status` is the 3xx code) and is not retried. The body and headers are never sent to the
redirect target. Configure the final proof server URL directly.

## Features

### Retry transient proof server errors (#1720)

`http-client-proof-provider` retries a request up to 3 times when the proof server answers 429, 500
or 503, or when the network fails.

- **429 is now retried.** Before, it failed at once.
- **`Retry-After` is followed** when present, as seconds or as an HTTP date. An invalid value falls
  back to the backoff (1 s, 2 s, 4 s). A wait longer than the timeout ends the request at the timeout.
- **502 and 504 are not retried** (as before). A gateway sends them when it stops waiting, but the
  proof server keeps proving. A retry would queue the same proof again. The decision is now in the
  package README.
- **The timeout is a strict deadline** for one HTTP request (`/check` or `/prove`). It covers every
  retry and every wait between them. A request that ran out of time is not retried. Before, the
  backoff wait ignored the timeout, so a call could run up to 7 s past it.
- The `fetch-retry` dependency is removed. A small local retry loop replaces it.

No config option changes. See the [package README](../../../packages/http-client-proof-provider/README.md#retry-behavior).

## Bug Fixes

### Segment id collision when merging scoped calls (#1732)

Each call in a contract-scoped transaction puts its intent in a random segment (1..65535). When two
calls drew the same id, `Transaction.merge` threw
`key (segment_id) collision during intents merge`. A scope with two calls failed about once in 65,535
runs.

Now, before the merge, every segment of the incoming call that is already used (its intent and its
fallible Zswap offer) moves to a free random id. This is safe: a segment id is bound to the
transaction only at proving and binding, and both happen after the merge. Applies to both eras
(`withLedger8ContractScopedTransaction`, `withLedger9ContractScopedTransaction`,
`withContractScopedTransaction`). Closes #1731.

### API docs: name the barrel root module (#1722)

The `.` entry of `@midnightntwrk/midnight-js` had no module name, so TypeDoc wrote it as an empty
link. It is now named `index`, like the root module of every other package. Documentation only.

## Refactoring

### Era gates cover every era (#1719)

Internal hardening for the next ledger era. No change in behaviour for ledger 8 or ledger 9.

- A lint rule bans comparing a value with an era literal (`x === 'v8'`) in package sources. Era
  branches use `switch` + `assertNever`.
- Era branches in `contracts` now refuse an unknown era instead of treating it as ledger 9 or as the
  head era. The scope entry points refuse an outer scope of an era they do not know, instead of
  starting a separate scope.
- The dist laziness test runs over every retained era. Closes #1538.

## Dependencies

### Runtime

| Package | v5.0.2 | v5.0.3 | Used by |
|---------|--------|--------|---------|
| `fetch-retry` | `^6.0.0` | removed | `http-client-proof-provider` |
| `graphql` | `^17.0.1` | `^17.1.0` | `indexer-public-data-provider` |
| `graphql-ws` | `^6.4.1` | `^6.4.2` | `indexer-public-data-provider` |
| `ws` | `^8.20.0` | `^8.23.0` | `indexer-public-data-provider` |

### Development and tooling

- Minor and patch bumps of 25 dev tools, among them `vite` 8.3.8, `vitest` 5.1.0, `eslint` 10.15.0,
  `typescript-eslint` 8.72.2, `turbo` 2.11.11, `prettier` 3.10.1, `typedoc-plugin-markdown` 4.14.1
  (#1717).

### Testkit

- Nightly e2e stacks (preview, preprod, qanet, mainnet) move to node `2.1.101`, indexer `4.4.101`,
  proof server `9.0.2`. The `v8era` stack uses node `2.1.101` and indexer `4.4.101` on a ledger 8
  genesis, with proof server `8.1.3`. This fixes the nightly `Wallet sync timeout` (#1724).

## CI

- Pending release runs on `main` are no longer cancelled by a newer push (#1685).
- Legacy uses of the MidnightCI packages token removed (#1721).

## Documentation

- Contributor guide: shorter architecture section in `CLAUDE.md`, path-scoped agent rules under
  `.claude/rules/`, `compactc-bump` and `run-e2e` agent skills, code navigation guidance in
  `DEVELOPMENT.md` (#1725, #1726, #1727, #1730, #1734).
- `http-client-proof-provider` README: retry rules, timeout, redirects (#1720, #1733).
- API documentation regenerated (#1709, #1723).
