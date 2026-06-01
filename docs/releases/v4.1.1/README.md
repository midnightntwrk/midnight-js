# midnight-js v4.1.1 Release Documentation

**Release Date:** June 1, 2026
**Previous Version:** v4.1.0
**Migration Complexity:** None (drop-in patch release)

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - None in v4.1.1
- [New Features](./new-features.md) - None in core (testkit-js tooling only)
- [Migration Guide](./migration-guide.md) - Dependency bump only
- [API Changes](./api-changes.md) - Re-exports and additive helpers

## Breaking Changes (0)

No breaking changes. v4.1.1 is a drop-in upgrade from v4.1.0.

## Notable Behaviour Changes

- **Signing-key import validates entries up-front** — a single malformed entry now aborts the import without partial writes (was: opaque failure at later `submitTx`) (#926)
- **Export/import password policy aligned with storage policy** — `exportPrivateState` / `exportSigningKey` now reject weak passwords (insufficient character classes, repeated characters, sequential patterns) instead of accepting any 16-char string (#922)
- **`contractStateObservable` now emits for `blockHeight` / `blockHash` configs** — previously produced an empty observable due to a misplaced internal filter (#911)
- **Plain `http://` / `ws://` provider URLs against non-loopback hosts log a one-shot `console.warn`** at provider construction — informational only; connections are not blocked (#920)

## Key Security Fixes

- Signing-key import payload validation prevents crafted exports from injecting `null`, `undefined`, or malformed strings into the encrypted store (#926)
- Full password policy (length + classes + no repeats + no sequences) is now applied to export/import operations, closing the gap with storage password enforcement (#922)
- `console.warn` emitted at provider construction when sensitive payloads (transaction bodies, proof requests, contract state queries) would be transmitted in clear text to a non-loopback host (#920)
- Security advisory dependency bumps: `axios`, `protobufjs`, `uuid`, `ws`, `qs`, `picomatch`, `postcss`, `yaml`, `ip-address`, `fast-uri`, `fast-xml-parser`, `minimatch`, `turbo` (#925)

## Key Bug Fixes

- `contractStateObservable({ type: 'blockHeight', blockHeight }) ` and `({ type: 'blockHash', blockHash })` now emit the contract state at the requested block instead of completing silently with no value (#911)

## Quick Migration

No code changes required. Bump the dependency and reinstall:

```bash
yarn upgrade @midnight-ntwrk/midnight-js@4.1.1
yarn install
```

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.0+

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] If using `contractStateObservable` with `blockHeight` / `blockHash` configs: verify emissions are received (regression fix)
- [ ] If exporting private state or signing keys: confirm export passwords satisfy the storage password policy (otherwise export now fails)
- [ ] If using provider URLs against remote hosts: review the new insecure-URL warning and switch to `https://` / `wss://` where applicable

---

**Last Updated:** June 1, 2026
**License:** Apache-2.0
