[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / LEDGER\_TRANSACTION\_TAGS

# Variable: LEDGER\_TRANSACTION\_TAGS

> `const` **LEDGER\_TRANSACTION\_TAGS**: `Readonly`\<\{ `v8`: `Readonly`\<\{ `Finalized`: `"midnight:transaction[v9](signature[v1],proof,pedersen-schnorr[v1])"`; `Unbound`: `"midnight:transaction[v9](signature[v1],proof,embedded-fr[v1])"`; `Unproven`: `"midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1])"`; \}\>; `v9`: `Readonly`\<\{ `Finalized`: `"midnight:transaction[v12](signature[v2],proof,pedersen-schnorr[v1])"`; `Unbound`: `"midnight:transaction[v12](signature[v2],proof,embedded-fr[v1])"`; `Unproven`: `"midnight:transaction[v12](signature[v2],proof-preimage,embedded-fr[v1])"`; \}\>; \}\>

The full header each ledger era writes in front of a transaction at each stage: the schema
version, then the signature, proof and binding markers.
