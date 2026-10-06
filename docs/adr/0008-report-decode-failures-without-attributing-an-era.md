# 0008. Report decode failures without attributing an era

- Status: Accepted
- Date: 2026-09-07
- Deciders: Szymon Paluchowski

## Context

The indexer public-data provider decodes each finalized-transaction record with
the runtime of the era that record's own `protocolVersion` selects. When the
bytes do not decode on that runtime, two very different things may have
happened:

1. The record is internally inconsistent — the indexer dated bytes from one era
   to a block from another.
2. The consumer's `@midnightntwrk/ledger`-vN is a different vintage than the
   network's, so the tag in the payload does not match the tag the installed
   binding expects. Same era on both sides; ordinary dependency skew.

The deserialization layer in `@midnight-ntwrk/midnight-js-utils` classifies the
underlying failure and attaches a mitigation. For `version-mismatch` that
mitigation is "align the version of `@midnightntwrk/ledger`-vN … with the
protocol version of the network and indexer you are connecting to" — case 2.

An earlier iteration of this read path wrapped such failures in a provider
error asserting case 1 ("the record contradicts itself, so this is an
inconsistent indexer rather than a version mismatch in your dApp's
dependencies"), gated on the classifier's `direction` field being set. Two facts
defeat that gate:

- `direction` is inferred by comparing the `[vN]` markers inside a
  serialization tag. That `vN` is the version of the object's serialized shape,
  not the ledger era: a **v8** ledger serializes a transaction as
  `midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):`. So
  a set `direction` is evidence of object-schema drift, which case 2 produces
  just as readily as case 1.
- Two of the classifier's era-identifying patterns — `unrecognised
  discriminant` and `unsupported (proof|guaranteed transcript|fallible
  transcript) version` — set no `direction` at all
  (`packages/utils/src/test/classify-deserialization-error.test.ts`). A genuine
  cross-era record failing on a nested versioned enum therefore fell outside the
  gate.

The gate was thus wrong in both directions, and where it fired it demoted the
one mitigation that helps in case 2 to `cause` and replaced it with a claim
that case 2 contradicts.

## Decision

We will not re-attribute a decode failure at the read boundary. A payload that
does not decode on the era selected for it leaves as the `DeserializationError`
the runtime produced.

The provider adds only what it knows for certain, as structured diagnostic
detail on that error's `context.details`: the era it dispatched to, the raw
`protocolVersion`, the read seam, and the record reference. Those are facts. The
question of which side is at fault is not, and we will not answer it.

Era *resolution* failures are unaffected and stay `IndexerError` subclasses:
`EraUnresolvableError` when a `protocolVersion` maps to no era, and
`EraUnsupportedError` when the resolved era has no decoder in this build.

## Consequences

- **Positive:** the mitigation the caller reads is the one the layer that
  actually diagnosed the failure wrote. Ordinary ledger-package skew is no
  longer reported as a broken indexer, and a genuine cross-era record is no
  longer silently excluded from the diagnosis. Consumers matching
  `isDeserializationError` at the top level keep matching.
- **Negative:** a consumer who wants to distinguish the two cases gets no help
  from the type system; they must read `context.details` alongside the
  classification. We ship one fewer error class and one fewer error code than
  the earlier iteration advertised.
- **Follow-ups:** if the two cases must be told apart, the evidence has to come
  from the era vocabulary rather than from tag `[vN]` numbers — for example, a
  classifier signal derived from the tag's type namespace, or probing the other
  era's decoder. Either belongs in `packages/utils`, not at this seam.

## Alternatives considered

- **Keep the wrapper, gate it on the classification alone.** Strictly worse:
  empty, truncated and garbage payloads all reach `version-mismatch` because the
  tag-header pattern is permissive on the incoming tag, so corruption would be
  reported as an era disagreement.
- **Keep the wrapper, prove the claim by decoding with the other era's runtime.**
  This is real evidence — bytes that decode on the other era do contradict the
  block that dated them. Rejected for now because it instantiates the second
  WASM runtime on every failure path, which defeats the lazy-acquisition
  property this read path exists to preserve, for a diagnosis rather than a
  result.
- **Keep the wrapper, soften the message to name both possibilities.** Leaves a
  provider-specific error class whose only content is "one of two things
  happened", while burying the actionable mitigation one level down. The
  underlying error already says as much, better.
