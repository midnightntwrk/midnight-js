# Breaking Changes v4.1.1

**None.**

v4.1.1 is a patch release. No public API surface has been removed, renamed, or had its signature changed. Every import that worked in v4.1.0 continues to work identically in v4.1.1.

## Behaviour Changes (non-breaking, but worth knowing)

The following are fixes — code that depended on the old (buggy) behaviour may need attention, but the public API contract has not changed.

### 1. `contractStateObservable` now emits for `blockHeight` / `blockHash` configs (#911)

In v4.1.0, `contractStateObservable({ type: 'blockHeight', blockHeight })` and `({ type: 'blockHash', blockHash })` produced an empty observable. Subscribers received no values and the observable never completed with state.

In v4.1.1, both config shapes emit the contract state at the requested block, matching the documented behaviour. Code that previously relied on the empty-observable behaviour (none expected — this was a bug) must adapt.

### 2. Export passwords now subject to the full storage policy (#922)

In v4.1.0, `exportPrivateState` and `exportSigningKey` accepted any password ≥16 characters. In v4.1.1, the same passwords must additionally satisfy:

- character-class diversity (at least 3 of: lower, upper, digit, symbol)
- no character repeated more than 3 times consecutively
- no monotonic ASCII sequences of length ≥4 (e.g., `1234`, `abcd`)

`PrivateStateExportError` / `SigningKeyExportError` are thrown as before; the underlying `PasswordValidationError` is attached via `cause` and exposes a typed `reason` discriminator for programmatic inspection.

**Action required only if:** your application generates export passwords programmatically or surfaces a UI that accepts passwords below the storage policy. Strengthen the password (or surface the failure reason) — the contract on the public exception types is unchanged.

### 3. Signing-key import validates entries up-front (#926)

In v4.1.0, a crafted export containing `null`, `undefined`, or a malformed string for any individual entry would write that entry to the encrypted store and surface as an opaque failure during a later `submitTx`. In v4.1.1, the import aborts with a structural validation error **before** any `setSigningKey` call, and no partial writes occur.

**Action required only if:** your application has tests that depended on the partial-write behaviour. Genuine imports of well-formed exports are unaffected.

### 4. Insecure-URL warning at provider construction (#920)

In v4.1.0, constructing `IndexerPublicDataProvider` or `HttpClientProofProvider` with a plain `http://` (or `ws://`) URL pointing at a remote host produced no diagnostic. In v4.1.1, a single `console.warn` is emitted at provider-factory construction.

The connection itself is **not** blocked — the warning is informational. Loopback hosts (`localhost`, `127.0.0.1`, `::1`) are exempt.

**Action required only if:** your test or CI environment is sensitive to `console.warn` output. Switch to `https://` / `wss://` for remote hosts, or filter the warning at the log-sink layer.

---

## Common Migration Issues

None — v4.1.1 is a drop-in replacement for v4.1.0.

If you observe a previously-working flow throwing in v4.1.1, it is almost certainly one of the four behaviour changes above — see the `Action required only if` notes for each.
