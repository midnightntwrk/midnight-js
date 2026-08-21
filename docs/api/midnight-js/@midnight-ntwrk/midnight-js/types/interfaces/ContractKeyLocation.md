[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractKeyLocation

# Interface: ContractKeyLocation

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:27

The canonical key-location grammar for contract calls.

A transaction carries one proof per contract call, and each call prototype carries a
`key_location` string that routes the call to the proving material (prover key, verifier key,
ZKIR) for its circuit. The ledger treats `key_location` as opaque prover-routing metadata: it is
written by the transaction assembler, round-tripped verbatim to the proving provider, and never
enters consensus. Historically the bare circuit name was used, which collides when two contracts
in the same transaction deploy identically named circuits.

The canonical grammar is:

```
contract:<contract-address-hex>/<circuitId>?vk=<sha-256 of the deployed raw verifier key, hex>
```

- `<contract-address-hex>` is the 64-character hex encoding of the contract's address;
- `<circuitId>` is the circuit's identifier, restricted to `[A-Za-z0-9_]+` so that locations
  can never traverse paths when a prover maps them onto a file system;
- `vk` is the lowercase hex SHA-256 digest of the raw verifier key bytes deployed for the
  circuit, allowing provers to resolve key material by verifier-key content (a vk-join) rather
  than trusting a name.

The `midnight/` prefix is reserved for protocol builtins (e.g. `midnight/zswap/spend`) and is
never produced or parsed by this codec.

## Properties

### circuitId

> `readonly` **circuitId**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:31

The identifier of the circuit being invoked.

***

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:29

The hex-encoded address of the contract being called.

***

### verifierKeyHash

> `readonly` **verifierKeyHash**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:33

The lowercase hex SHA-256 digest of the circuit's deployed raw verifier key.
