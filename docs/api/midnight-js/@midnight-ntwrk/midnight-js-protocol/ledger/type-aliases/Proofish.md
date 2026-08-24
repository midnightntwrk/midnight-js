[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Proofish

# Type Alias: Proofish

> **Proofish** = [`Proof`](../classes/Proof.md) \| [`PreProof`](../classes/PreProof.md) \| [`NoProof`](../classes/NoProof.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1194

How proofs are currently being represented, between:
- Actual zero-knowledge proofs, as should be transmitted to the network
- The data required to *produce* proofs, for constructing and preparing
  transactions.
- Proofs not being provided, largely for testing use or replaying already
  validated transactions.
