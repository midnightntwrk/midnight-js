[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / MaintenanceAuthorityMismatchReason

# Type Alias: MaintenanceAuthorityMismatchReason

> **MaintenanceAuthorityMismatchReason** = `"not-first-member"` \| `"empty-committee"` \| `"threshold-above-one"`

Why a maintenance update cannot be signed by the key held for a contract:
- `'not-first-member'` — the key's verifying key is not the first member of
  the contract's maintenance authority committee, the member every update is
  signed for.
- `'empty-committee'` — the authority has no committee, so no key can sign
  for it.
- `'threshold-above-one'` — the authority needs more signatures than the one
  every update carries.
