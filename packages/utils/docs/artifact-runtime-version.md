---
title: ArtifactRuntimeVersion
---

# Naming an artifact set's era, and who gets to name it

A ZK artifact set declares the `compact-runtime` it was compiled against. That
one string places the artifact on the ledger-era timeline, which is what selects
the pipeline that executes a call.

This document records why only that member is read, why an absent answer is a
refusal rather than a default, and why the two `ZkConfigProvider`
implementations consult their sources in the order they do.

The reader is `parseZkArtifactRuntimeVersion`
(`packages/utils/src/zk-artifact-contract-info.ts`). The providers that call it
are `@midnight-ntwrk/midnight-js-node-zk-config-provider` and
`@midnight-ntwrk/midnight-js-fetch-zk-config-provider`.

## Only the runtime version is read

`contract-info.json` carries a good deal more, and none of it is returned.

Every other member is the contract's own description and belongs to the
toolchain, not to this framework. The runtime version is the only member callers
act on, so it is the only one this reader promises anything about — widening the
return value would make this framework a party to a file it does not own.

## Absence is a refusal, not a default

A missing, empty or non-string `runtime-version` throws. It does not answer
`undefined`.

An absent answer here is indistinguishable from an artifact set that declares
nothing, and a caller can act on neither. More to the point, this framework
cannot name an artifact set's era on its behalf: a guess that happens to be right
is indistinguishable from one that is wrong until a proof has been paid for and
refused.

## The manifest is consulted before the compiler description

Both providers prefer the INTEGRITY MANIFEST, and the ordering is a security
property rather than a performance one.

`expectedManifestHash` pins the manifest to a digest the APPLICATION supplies at
build time. Everything else in a bundle — the compiler description included — is
served from the same place as the artifacts it describes. Since this value
selects which ledger pipeline executes the call, whoever serves the artifacts
must not be the one who decides it.

`compiler/contract-info.json` is the fallback, for bundles that carry no manifest
at all: `compactc` only began emitting one in 0.33, which is exactly the
retained-era case. It goes through the same integrity gate as every verifier key
and ZKIR, so under the default `require` mode an unvouched-for description is
refused rather than trusted.

## The answer is cached, the failure is not

Each provider caches the answer per instance, for the same reason it caches the
manifest: the answer is one statement about the whole bundle.

A FAILED read is never cached. A transient fault — a network error for the
fetching provider, I/O for the file-system one — must not permanently refuse an
artifact set that is really there.
