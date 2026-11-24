# midnight-js v5.0.3 Release Documentation

**Release Date:** TBD
**Previous Version:** v5.0.2
**Node.js Requirement:** >=22.12
**Migration Complexity:** Low. Update the dependency. Check your setup only if your proof server URL
answers with a redirect.

## Quick Links

- [Release Notes](./release-notes.md): a one-page summary.
- [Breaking Changes](./breaking-changes.md): no API breaks; two behaviour changes in the HTTP proof provider.
- [New Features](./new-features.md): retry rules for the HTTP proof provider.
- [API Changes](./api-changes.md): no export changes.
- [Migration Guide](./migration-guide.md): the upgrade step by step.

## Breaking Changes

None in the API. Two behaviour changes in `http-client-proof-provider`:

- **Redirects are refused.** A 3xx answer from the proof server fails with `ProofServerError` and is
  not retried. Before, the request followed the redirect, with its body and headers (#1733).
- **429 is retried.** The provider waits for `Retry-After` (or the usual backoff) and tries again.
  Before, a 429 failed at once (#1720).

## Key Fixes

- A contract-scoped transaction with two or more calls no longer fails with
  `key (segment_id) collision during intents merge`. It failed about once in 65,535 runs (#1732).
- The proof server timeout is now a strict deadline. It covers every retry and every wait between
  retries (#1720).

## Quick Migration

```bash
yarn up @midnightntwrk/midnight-js@5.0.3
```

See [migration-guide.md](./migration-guide.md) if your proof server sits behind a redirect.

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Unit and integration tests pass
- [ ] `url` points to the final proof server URL, not to a URL that redirects
- [ ] If you see more 429 answers in proof server logs: expected, the provider now retries them

---

**Last Updated:** November 24, 2026
**License:** Apache-2.0
