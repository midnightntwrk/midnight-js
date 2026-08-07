# 0008. Surface previous-version records as raw bytes plus version int; name record helpers on the raw/decoded axis

- Status: Accepted
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (D5, v3.6/v3.8 rulings), ADR 0005, ADR 0006

## Context

After a fork, providers return historical records encoded with the previous
ledger version alongside current ones. Core interfaces (e.g.
`FinalizedTxData.tx`) are typed against the current ledger; a decoded
previous-version object cannot inhabit them without a union, a brand, or a
banned cast — exactly the machinery ADR 0006 rejects. Decoding
previous-version records requires the previous WASM stack, which core
packages must not carry (ADR 0005). Every record already carries a
`protocolVersion` int.

## Decision

We will surface previous-version records across core APIs as **raw bytes plus
their version int**, decoded dApp-side with the compat codec (ADR 0005):

- One additive field: `rawTx: Uint8Array`, populated on previous-version
  records **only** — its presence/absence is the runtime discriminant.
- The declared `tx` field stays required (a documented lying type on
  previous-version records). Reading it on such a record throws a typed
  error naming the compat codec, via a **non-enumerable accessor** —
  serialization, spread, `structuredClone`, deep equality and logging never
  trip it; only a direct read at the version seam does.
- Runtime helpers live in `utils` (`types` stays declarations-only):
  - `isDecodedTxData()` — type guard narrowing on `rawTx` absence,
    re-exported by the `midnight-js` barrel;
  - `createRawFinalizedTxData()` — the mandatory factory installing the
    throwing accessor; providers **and testkit mocks** must construct
    previous-version records through it, because an object literal
    silently satisfies the interface without the throw (tests pass on
    mocks, production throws).
- Helper names use the **raw/decoded vocabulary, never a version number**:
  the discriminant is payload form, the helpers carry no previous-version
  code (bytes + int + a `defineProperty` accessor), and the same mechanism
  serves the next fork window without a public-API rename. The record's
  version lives in the data (`protocolVersion`), not in function names.

## Consequences

- **Positive:** core interfaces stay single-version-typed with zero
  previous-version knowledge in providers; no unions/brands/casts; the
  compile surface is consumer-compile-compatible (additive field only);
  the mechanism is fork-generic.
- **Negative:** the `tx` type lies on previous-version records — a weak
  compile-time signal by design, mitigated by the guard and a documented
  runtime break; copies made by spread/clone drop the accessor (`tx`
  silently `undefined`), so consumers must re-guard after cloning.
- **Follow-ups:** descriptor-parity test between provider and mock records;
  TROUBLESHOOTING entries for the throw and the copy caveat.

## Alternatives considered

- **Decode previous-version records in the provider behind an injected
  codec:** rejected — puts an injection seam and version knowledge into a
  core package; kept as a recorded fallback only if provider-internal
  logic is found to need decoded fields.
- **Union / branded type for `tx`:** rejected — spreads two-version
  complexity to every consumer forever (ADR 0006).
- **Version-named helpers (`isV9TxData`, `createV8FinalizedTxData`):**
  rejected — falsely implies version-specific code in core and forces a
  public-API rename every fork window.
