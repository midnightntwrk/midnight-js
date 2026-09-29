[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / ErrorVocabulary

# Two guards, and why they are two

This package owns the vocabulary every other package's errors are recognised
through: a registry of this framework's codes, a guard for them, and a separate
guard for everybody else's. This document records why the second guard exists as
its own function, why foreignness is enforced twice, and why a deserialization
failure is classified rather than re-thrown.

## `hasErrorCode` and `hasForeignErrorCode` are deliberately separate

`hasErrorCode` tests for a code this framework owns. `hasForeignErrorCode` tests
for one that belongs to someone else — Node's `ECONNREFUSED`, a driver's own
vocabulary, anything outside `MidnightJsErrorCode`.

They are two functions so that reaching outside this framework's codes is
DELIBERATE AND VISIBLE at the call site, instead of being the same call that a
typo quietly degrades into. One function serving both would answer `false` for a
misspelled framework code and for a genuine foreign one alike, and the reader of
that call site could not tell which was meant.

## Foreignness is enforced twice, because one gate cannot see both cases

**At compile time**, via the `ForeignErrorCode` constraint: a code this framework
owns is rejected by the compiler.

**At run time**, by prefix: a code that only LOOKS like one of ours — a
misspelling, which is the case that sends a caller to this function in the first
place — satisfies that constraint, so the compiler cannot catch it.

The runtime case THROWS rather than answering `false`. A silent `false` is
exactly the guard that constraining `hasErrorCode` set out to abolish, reached
through the other door. A misspelled code is a mistake at the call site, not a
property of the error being tested, so it is raised.

## A deserialization failure is classified, never re-thrown bare

`withDeserializationContext` wraps a synchronous deserialization call and
re-throws whatever it catches as a `DeserializationError` carrying structured
context, with the original value on `cause`.

A NON-`Error` throw is classified on its string form rather than escaping
unwrapped. Some wasm-bindgen bindings surface a `Result<_, String>` as a bare
string, and a caller that received one would get a value with no `cause`, no call
site and no `instanceof` identity to branch on.

It is sync-only BY CONTRACT, and the contract is enforced: if `fn()` returns a
thenable the wrapper throws a `TypeError` rather than silently bypassing
classification. Any rejection from that thenable would otherwise escape the
`try`/`catch` entirely — the failure this check exists to make impossible.

The typed wrappers in `src/deserialization/typed-wrappers.ts` are the primary
API. Reach for the higher-order function directly only at ad-hoc deserialization
sites those do not cover.
