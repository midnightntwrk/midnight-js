---
title: VerifierKeys
---

# Verifier keys on a deploy

A compiled contract's constructor declares one operation slot per circuit but
leaves each slot's verifier key blank. A deploy therefore has to carry real keys,
and the address it lands at is derived from the state AFTER those keys are
registered. That makes the verifier-key map the one deploy option whose
validation is not merely hygiene: getting it wrong deploys a contract at an
address the caller's own artifacts do not describe.

This document records why the map is optional on the era facade but demanded by
both deploy legs, and the rules
`resolveVerifierKeyRegistrations`
(`packages/protocol/src/lib/shared/verifier-keys.ts`) enforces before any key is
registered. The order in which the other compose options are refused is a
separate thread — see `ComposeRefusalOrder`.

## Optional on the facade, demanded by both deploy legs

`verifierKeys` is optional on the facade so that a state which ALREADY carries
its keys can be deployed as-is. It is required by the v8 deploy leg
(`packages/protocol/src/lib/v8/deploy.ts`, reached through
`packages/protocol/src/lib/v8/adapt.ts`): that leg registers the compiled
contract's keys onto the initial state itself, and a constructor-built state
declares every entry point with a blank key. A deploy composed without the map
would carry unregistered entry points and be refused by the ledger's own
well-formedness check, so the omission is reported as `ComposeOptionError` with
option `'verifierKeys'` instead.

Omitting the map for a constructor-built state is a different thing entirely
from the case the optionality exists for: every entry point is declared blank,
the deploy derives its address from that blank state, and the contract lands on
chain unable to verify any call against it. Nothing fails until the first call,
which reports `'call-verifier-key'` a long way from the cause. That is why the
v9 leg's `assertStateCarriesKeys` (`packages/protocol/src/lib/v9/compose.ts`)
refuses a state still declaring a blank key when no map was supplied — it makes
the two arms agree without taking away the one case the optionality exists for.

Two details of that v9 check are deliberate. It uses `?.`, which collapses "no
operation resolves" into "operation has a blank key" — something
`packages/protocol/src/lib/shared/contract-state.ts` deliberately refuses to do
for the same call. It is safe here because both answers have the one remediation
this check exists to demand, supply the map, whereas a decoded state hands its
caller a `verifierKey` field whose absence means "never deployed". And it is
raised as the OPTION error, not as `ComposeFailedError`'s
`'deploy-verifier-key'` stage, even though that stage means exactly this
condition and would name the offending entry point: the v8 arm refuses the same
omission as `ComposeOptionError('v8', 'verifierKeys')`, and a caller writing one
handler across both eras matters more than naming which of a contract's slots
was blank. Naming it as well needs a `circuitId` on `ComposeOptionError`, which
is a wider change than this seam should make.

## Registration rules

`resolveVerifierKeyRegistrations` validates the supplied map against the state's
declared entry points in BOTH directions, before anything is registered:

- a key naming an entry point the state does not declare throws
  `ComposeFailedError` at stage `'deploy-unknown-circuit'`. This direction
  matters as much as the other: `setOperation` CREATES a slot rather than
  requiring one, so an unchecked stray key (a stale `keys/*.verifier` from an
  earlier compiler run) would give the deployed contract an entry point its
  source never had and — since the deploy derives its address from the initial
  state — silently deploy it at a different address than the caller's artifacts
  describe;
- a declared entry point with no key in the map throws stage
  `'deploy-verifier-key'`, because a ledger rejects a deploy carrying an
  unregistered entry point.

Together the two make the map and the declared entry points equal sets. They run
on resolved NAMES, because that is how the map is keyed, so two declared entry
points resolving to one name would make them agree while leaving a slot blank;
that case throws stage `'deploy-ambiguous-circuit'` before either check runs.
The order is itself part of the contract for that reason: ambiguity is refused
before either set-comparison runs, because an ambiguous pair makes both
comparisons agree while leaving one slot blank.

Registrations come back in the map's own order, each carrying the DECLARED entry
point rather than its resolved name: `setOperation` handed the name would leave
a byte-declared slot blank and create a second, undeclared one beside it.
Resolving each key inside the loop is also what removes the non-null assertion
the set arithmetic would otherwise need at the end — the `undefined` branch IS
the `'deploy-verifier-key'` check, not an unreachable case to assert away.

The resolver is shared by both eras' deploy legs, so the two cannot drift on
which checks run or in what order, and each leg's own docs point at it rather
than restating the three refusals. Restating them would be a second copy of the
one contract the resolver exists to remove.

## Why the deployed address cannot be recomputed

The address is derived from the initial state AFTER the verifier keys are
registered AND a fresh nonce is minted, so a caller cannot recompute it at all:
repeating the registration would not reproduce it. That is why a composed deploy
hands back a record rather than a bare `Uint8Array` — the transaction alone is
not enough to use the deployment. The `initialState` beside it is the state that
address was derived from, which is what a caller stores and later hands to a
call.

## Key bytes the ledger itself rejects

Registering a key the ledger refuses is a separate failure, raised by each leg
as `ComposeFailedError` at stage `'deploy-verifier-key-blob'` with the ledger's
own failure on `cause`, so the failure names the entry point it belongs to. The
setter validates a tagged `midnight:verifier-key[...]` blob, so a truncated,
empty or wrong-era key fails at composition rather than at submission.

## Resolving an entry point to a name

`entryPointName` resolves a ledger entry-point key to its name.
`ContractState.operations()` is declared `Array<string | Uint8Array>`, so a key
is not statically a string. In practice ledger-v8 decodes even a byte-set entry
point back to a string (pinned by the `entryPointName` suite in
`v8-deploy.test.ts`; the v9 side of that behaviour is not pinned against the
real vendor), but the declared union has to be resolved somewhere, and decoding
is the only resolution that keeps an error message naming the entry point rather
than dumping its bytes — which is what `ComposeFailedError` promises.

It lives in a leaf module both eras can reach, so neither arm has to import the
other's era-named module for a `TextDecoder` call.
