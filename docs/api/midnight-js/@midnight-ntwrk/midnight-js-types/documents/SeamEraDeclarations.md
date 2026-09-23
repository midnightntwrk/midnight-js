[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / SeamEraDeclarations

# What a seam says it serves, and what happens when it is wrong

Three provider seams carry a transaction: `proveTx`, `balanceTx`, `submitTx`, in
that order. Each declares a `supportedEras` set. This document records why the
declaration is read up front, why it is not trusted, and why the two refusals
that result are two rather than one.

The payloads these seams carry are
[VersionTaggedPayloads](VersionTaggedPayloads.md). The multi-era construction
is `docs/adr/0014-build-provider-seams-from-per-era-arms.md`.

## The pre-flight check is about WHERE it runs

`assertSeamsSupportEra` refuses an operation whose era is not served by all three
seams, before the operation does any work.

The point is the placement, not the test. Proving is the expensive step and it is
the FIRST of the three. A wallet that cannot balance a retained-era transaction
otherwise costs a full proving cycle before anything notices. Read up front, the
same gap costs one comparison.

It is generic in the era, so a further ledger era needs no change there.

## The declaration is a claim, and nothing verifies it

The pre-flight check does not make the seams safe by itself, and is not meant to.
`supportedEras` is what an implementation SAYS about itself.

So each seam still narrows its own payload, and still reports
`V8PayloadUnsupportedError` when a declaration turns out to have been wrong. The
narrowing is unchanged and is what actually holds.

## Why the two errors stay distinct

They mean different things to whoever is reading them:

| Error | What it means | What to do |
|---|---|---|
| `SeamEraUnsupportedError` | A seam declared it does not serve this era, and the operation stopped before doing any work | Wire a different provider |
| `V8PayloadUnsupportedError` | A seam was handed the retained arm and could not take it | The implementation on that seam does not serve it — its declaration was wrong, or there is no declaration to be had |

Collapsing them would lose the distinction between "configured wrong, nothing
spent" and "failed at the seam, possibly after paying to prove".

## Which providers refuse the retained arm, and why

`V8PayloadUnsupportedError` does not mean "the framework cannot do this yet". It
means the specific implementation on that seam does not serve the retained arm.
Two quite different cases produce it:

**Permanently, from the lifting adapters.** `createProofProvider`,
`createWalletProvider` and `createMidnightProvider` each lift a v9-ONLY
implementation into the version-tagged interface. Refusing the retained arm is
the adapter accurately reporting what it wraps, not a gap to be filled. To serve
both eras, use the `…FromArms` constructors, or implement the interface directly.

**Contingently, from a concrete provider.** `httpClientProofProvider` and
`dappConnectorProofProvider` both DO serve the retained arm, taking and returning
serialized bytes. Other implementations that have not been widened still raise
it.

`V8PayloadUnsupportedError` lives in this package rather than in each provider
package because the payload union it rejects is defined here, on the provider
interfaces every implementation shares. Catch it via its stable `code`, using
`hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.

## Why the lifting adapters exist at all

They exist to keep the `version` tag out of implementation code, and the reason
is a compiler diagnostic.

`balanceTx`'s return type is covariant, so an implementation still resolving a
bare `FinalizedTransaction` no longer satisfies `WalletProvider`. TypeScript
reports the PARAMETER mismatch first, so the error names the twenty-odd ledger
methods `V8TxBytes` lacks — rather than the missing `version` tag, which is the
actual problem. An implementer meeting that error has no path from it to the fix.

Tagging through `createWalletProvider` or `createMidnightProvider` means the
error never arises.
