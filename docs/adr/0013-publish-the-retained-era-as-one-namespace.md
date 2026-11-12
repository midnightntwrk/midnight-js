# 0013. Publish the retained era as one namespace

- Status: Superseded by ADR-0018
- Date: 2026-09-11
- Related: [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md),
  [ADR 0017](./0017-error-codes-are-the-contract.md)

This ADR published the ledger 8 types and errors under one `Ledger8` namespace.
That namespace no longer exists.

- Ledger 8 types and errors are flat `Ledger8*` exports. The naming rule is in
  [ADR 0018](./0018-name-single-ledger-code-after-its-ledger.md).
- Ledger 8 errors were merged into one class per fault. The rule is in
  [ADR 0017](./0017-error-codes-are-the-contract.md).
