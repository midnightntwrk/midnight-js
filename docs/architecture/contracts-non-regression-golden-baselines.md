# `packages/contracts` non-regression golden baselines

Covers `packages/contracts/src/test/non-regression-golden.test.ts` and its fixture
`packages/contracts/src/test/resources/golden/v9-native-composition.json`.

## Purpose

Capture the v9-native call-tx composition output of
`packages/contracts/src/utils/ledger-utils.ts` (`createUnprovenLedgerCallTx`, `toLedgerContractState`)
*before* ledger-era dispatch is added to this package, so that later era work can be shown not to
have changed the v9 path. The suite calls `createUnprovenLedgerCallTx` directly;
`unproven-call-tx.ts`, which delegates to it, is covered by `unproven-call-tx.test.ts` and is **not**
exercised here.

## How the baseline is captured

The suite drives a real execution of the `deposit` circuit against the compiled `shielded-map`
contract already checked into `src/test/resources/compiled/shielded-map/` — the same contract and
circuit `src/test/utils/ledger-utils.test.ts` uses for its `receiveShielded` coverage. Nothing is
compiled at test time.

Every stage observes a real return value and reads the assembled call back off `tx.intents`. This is
load-bearing: a golden value built by *reproducing* `createUnprovenLedgerCallTx`'s own argument list
would still pass byte-identically after a change to that list, because it would never call the
function it claims to guard.

| Stage | Pins |
|---|---|
| 1 | `toLedgerContractState(state).serialize()`, hex |
| 2 | the assembled call's guaranteed transcript (`effects`, `program`), its communication commitment, and the *shape* of its gas |
| 3 | `ContractCall.toString(true)` with the four gas fields redacted |
| 4 | structure only — one intent, one action, one shielded receive, no shielded spends |

Stages 2 and 3 bind the call to a fixed communication commitment
(`fixedInputs.communicationCommitmentRand`), which is what production does for an already-bound
sub-call, so that stage 2 can pin the resulting commitment. Stage 4 leaves it unbound, as the real
non-cross-contract path always does, so nothing derived from `Transaction.fromPartsRandomized`'s
fresh binding randomness is reproducible there.

`fixedInputs.blockTimeSeconds` is frozen because `createCircuitContext` otherwise defaults the block
time to `Date.now()`. Nothing in `deposit` reads it, so freezing it changed no pinned byte; it closes
a wall-clock input rather than fixing an observed failure.

## The fixture's own inputs are pinned

`inputHashes.files` records the sha256 of the two compiled artifacts every pinned value was captured
from. Recompiling the contract moves all of them at once, which is indistinguishable from a
composition regression unless the inputs are checked first. That check lives in its own top-level
suite, with no shared setup, so it stays readable even when the stages' `beforeAll` is what broke.

## Why gas is shape-checked and not pinned

Not because it is nondeterministic. Five consecutive runs of `deposit` produced byte-identical
`readTime`/`computeTime`/`bytesWritten`/`bytesDeleted`, and every `RunningCost` field is documented
"(modelled)" in `ledger-v9`; `Transcript.gas` is a declared budget, not a measurement. Gas is
excluded because it moves on any cost-model bump with no change in composition behaviour.

Redaction detail that matters: `ContractCall.toString(true)` renders two of those fields as
**formatted durations** — `read_time: 255.000µs`, `compute_time: 5.834ms` — and the other two as
plain integers. A digits-only value pattern therefore redacts `255` and leaves `.000µs`, a live cost
number, inside the pin. The pattern used is "starts with a digit, runs to the next `,` or `}`", and
stage 3 asserts exactly one match per field name before redacting, so a renamed field, a dropped
field, or a value that stopped being numeric fails by name instead of silently matching nothing.

## Known blind spots

- **`key_location`, `op`, `privateTranscriptOutputs`.** `ContractCall` exposes only `address`,
  `communicationCommitment`, `entryPoint`, `fallibleTranscript`, `guaranteedTranscript` and `proof`,
  so these three `ContractCallPrototype` arguments have no observable counterpart on the assembled
  call and do not appear in the Debug repr. A regression in the key-location encoding surfaces later,
  at proving time, when a prover fails to resolve the verifier key by that location.
- **`input`/`output` transposition.** Stage 2's commitment assertion pins `input`, `output` and the
  bound randomness, and catches the bound randomness being discarded for a fresh sample. It cannot
  catch the two being transposed *for this circuit*: `deposit` returns void, so `output` is the empty
  `AlignedValue` and both orderings hash alike. `communicationCommitment` is order-sensitive in
  general — on two distinct values the digests differ — so closing this needs a circuit with a
  non-empty return value.
- **Intent TTL and network id** are not observed by any stage.

## `Map` fields must be expanded before comparison

`Effects` has nine fields; five are `Map`s (`shieldedMints`, `unshieldedMints`, `unshieldedInputs`,
`unshieldedOutputs`, `claimedUnshieldedSpends`). `JSON.stringify` renders a `Map` as `{}` whatever it
holds, so a plain-JSON normalizer silently reduces those five to nothing and the byte pin cannot see
them — including `claimedUnshieldedSpends`, the one field `extractUserAddressedOutputs` reads. The
suite's normalizer expands `Map` and `Set` into tagged entry arrays, and stage 2 asserts the full
nine-key set by name so an upstream field added or renamed fails here rather than slipping past.

## Cross-call unshielded aggregation

`createUnprovenLedgerCallTx` aggregates user-addressed unshielded outputs with `calls.flatMap(...)`
across every call in the tree, because a payout can come from any callee, not just the root. Assembling
from the root alone would drop a callee's payout and leave the transaction unbalanced. That path is
covered in `src/test/utils/ledger-utils.test.ts` ("aggregates unshielded outputs across all calls"),
next to the existing single-call unshielded-offer tests, because the helpers it needs live there.
`claimedUnshieldedSpends` is a tuple-keyed `Map` present in both ledger eras, so it is also the part
an era shim is most likely to convert wrongly.

## Regenerating the fixture

```sh
cd packages/contracts
UPDATE_GOLDEN=1 yarn test src/test/non-regression-golden.test.ts
```

Every stage then records what it observed and writes it back, including both artifact hashes, so one
command updates the fixture and its input pins together. The mode is opt-in because a run in it will
happily record a genuine regression as the new baseline.

## Triaging a failure

1. `packages/contracts` changed and the change is intended — regenerate, and land the regenerated
   fixture as its own commit with no other production change riding along.
2. `packages/protocol` changed, or a ledger/runtime version moved — the bytes are expected to move;
   regenerate. Those versions live in the root `resolutions` and in `packages/protocol/package.json`,
   as `@midnightntwrk/ledger-v9`, `@midnightntwrk/onchain-runtime-v4` and
   `@midnight-ntwrk/compact-runtime`. This package's own `package.json` declares none of them.
3. The compiled artifacts moved — the input-hash suite fails first and says so.
4. None of the above — this is a regression. Investigate before regenerating: regenerating over a
   genuine regression makes it permanent.

## Note on the serialized tag

Stage 1's pinned hex begins `midnight:contract-state[v8]:`. That `[v8]` is the serialized object's
own schema version, not a ledger era. The fixture is captured against ledger v9 and the tag is
expected to read `[v8]` there.
