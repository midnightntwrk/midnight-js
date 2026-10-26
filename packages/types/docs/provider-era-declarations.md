---
title: ProviderEraDeclarations
---

# What a provider says it serves, and what happens when it is wrong

Three provider methods carry a transaction: `proveTx`, `balanceTx`, `submitTx`, in
that order. The provider behind each declares a `supportedEras` set. This document records why the
declaration is read up front, why it is not trusted, and why the two refusals
that result are two rather than one.

The transactions these methods carry are handles, described in
[VersionTaggedPayloads](./version-tagged-payloads.md). The multi-era construction
is `docs/adr/0014-build-provider-seams-from-per-era-handlers.md`, as amended by
`docs/adr/0019-carry-transactions-as-opaque-era-carrying-handles.md`.

## The pre-flight check is about WHERE it runs

`assertProvidersSupportEra` refuses an operation whose era is not served by all three
providers, before the operation does any work.

The point is the placement, not the test. Proving is the expensive step and it is
the FIRST of the three. A wallet that cannot balance a retained-era transaction
otherwise costs a full proving cycle before anything notices. Read up front, the
same gap costs one comparison.

It is generic in the era, so a further ledger era needs no change there.

## The declaration is a claim, and nothing verifies it

The pre-flight check does not make the providers safe by itself, and is not meant to.
`supportedEras` is what an implementation SAYS about itself.

So a provider built by a `…FromHandlers` factory checks again when a handle
arrives: a handle of an era it has no handler for is refused with
`ProviderEraUnsupportedError` before any work. That check is what actually
holds. A provider that implements the interface directly does the same check
itself, when it calls `LedgerTransaction.unwrap(handle, era)` for an era it does
not serve (`TransactionEraMismatchError`), or with its own code.

## One error, raised in two places

`ProviderEraUnsupportedError` (`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`) is
raised:

- by `assertProvidersSupportEra`, from the declarations alone, before an
  operation starts;
- by a provider built from handlers, when a handle arrives in an era it has no
  handler for. This can happen after proving, at `balanceTx` or `submitTx`, when
  a declaration was wrong.

Both have the same remedy: wire a provider that serves the era. The message says
which method refused, and whether a proof had been requested.

The READ side has its own refusal, `DecoderEraUnsupportedError`
(`MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED`). It means "this record cannot be
decoded", and its remedy is different: upgrade, or check the indexer. Keeping the
two codes apart lets `hasErrorCode` tell a wiring mistake from a decode failure.

## An unusable handler is refused before the provider exists

The factories check each handler when the provider is built. A handler that is
neither a function nor `undefined` — or, for
`createProofProviderFromProvingProviders`, an entry that is not an object with
callable `check` and `prove` — is refused with `UnusableEraEntryError`. An
object with no key for a ledger era, or with no era served at all, is refused
with `InvalidArgumentError`. This checks shape only: `supportedEras` never names
an era with no handler, but a well-formed handler paired with the wrong era
still passes
(see
[Why an in-process prover needs one proving provider per era](#why-an-in-process-prover-needs-one-proving-provider-per-era)).

## Which providers refuse the v8 era, and why

A refusal of the v8 era does not mean "the framework cannot do this yet". It
means the specific implementation of that provider does not serve v8. Two quite
different cases produce it:

**Permanently, from the lifting adapters.** `createProofProvider`,
`createWalletProvider` and `createMidnightProvider` each lift a v9-ONLY
implementation into the provider interface. Refusing v8 is the adapter
accurately reporting what it wraps, not a gap to be filled. To serve both eras,
use the `…FromHandlers` factories, or implement the interface directly. For the
proof provider there is a shorter route for the common case:
`createProofProviderFromProvingProviders` takes one `ProvingProvider` per era
and derives the handlers and the declaration from them. The section below says
when you want it.

## Why an in-process prover needs one proving provider per era

A server-backed proving client — the proof server, the DApp Connector — can
serve both eras from one `ProvingProvider`. It frames each request with the
ledger version that produced the transaction, and resolves key material per
request, so the era is a property of the call rather than of the client.

An in-process prover works the other way round. It frames nothing: it drives a
zkir runtime over bytes and never reads a ledger version. What it proves for is
fixed when it is built, by the key material it was given.

From `@midnightntwrk/wallet-sdk-prover-client` 2.0.0-rc.0 that key material is
per era — `makeV8KeyMaterialProvider` and `makeV9KeyMaterialProvider`, where
earlier versions had one line accepted by both. The eras' circuits were
generated as separate generations, and a node rejects a proof made with the
other era's, so one prover instance cannot serve both. The refusal lands at
`submitTx`, after the proving has been paid for.

`createProofProviderFromProvingProviders` is where each prover is paired with the era it
serves. It does not verify the pairing, and cannot:

- the v9 `ProvingProvider` shape is a structural superset of the v8 one, so
  registering the wrong one type-checks;
- one prover's `asProvingProvider()` and `asV8ProvingProvider()` return
  behaviourally identical objects — the era lives in the prover's key material,
  not in the object handed over — so no runtime check can tell them apart
  either.

What the factory gives is one place where the pairing is written down, instead
of every consumer assembling the handlers by hand.

**Contingently, from a concrete provider.** `httpClientProofProvider` and
`dappConnectorProofProvider` both DO serve v8. Each serializes the transaction
for the proof server or the wallet, and decodes the answer back into the
framework's ledger copy. Other implementations that have not been widened still
refuse it.

## Why the lifting adapters exist at all

They exist to keep the handle out of implementation code, and the reason is a
compiler diagnostic.

`balanceTx` returns a `FinalizedTx` handle, so an implementation still resolving
a bare `FinalizedTransaction` no longer satisfies `WalletProvider`. TypeScript
reports the PARAMETER mismatch first, so the error is about the ledger methods
the handle does not have — rather than the missing `seal`, which is the actual
problem. An implementer meeting that error has no path from it to the fix.

Going through `createWalletProvider` or `createMidnightProvider` means the error
never arises: the adapter unwraps each handle on the way in and seals the answer
on the way out.
