# 0019. Carry transactions as opaque handles that carry their era

- Status: Superseded by ADR-0024
- Date: 2026-10-26
- Related: [ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)

This ADR made every transaction in the public API a `LedgerTransaction` handle
that held a live ledger object of the framework's own copy.

The handle now holds the transaction's bytes and is decoded by the caller's own
ledger copy. Every rule of this ADR that still holds (the stage in the type,
`require` at every method, handlers keyed by era, the layer rule) is stated in
[ADR 0024](./0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md),
which is the single description of the transaction handle.
