# midnight-js v5.0.2 Release Documentation

**Release Date:** November 19, 2026
**Previous Version:** v5.0.1
**Node.js Requirement:** >=22.12
**Migration Complexity:** Low, but required. The packages have a new npm scope, so every import and
dependency must change its name. The code itself does not change.

## Quick Links

- [Release Notes](./release-notes.md): a one-page summary.
- [Migration Guide](./migration-guide.md): the upgrade step by step.

## Breaking Change

**The packages moved from `@midnight-ntwrk/*` to `@midnightntwrk/*`** (#1689). This applies to all
15 packages of this repository (`midnight-js*` and `testkit-js`). It is a breaking change shipped in a
patch release:

- Version 5.0.2 exists only under `@midnightntwrk/*`. Under `@midnight-ntwrk/*` the last version is
  5.0.1, and a range such as `@midnight-ntwrk/midnight-js@^5.0.0` stays on 5.0.1.
- `@midnightntwrk/*@5.0.1` also exists on npmjs. It was built from `main` during the move to the new
  scope, not from the `v5.0.1` tag. Use 5.0.2.
- Imports must use the new names. Example: `@midnight-ntwrk/midnight-js-contracts` becomes
  `@midnightntwrk/midnight-js-contracts`.

The public API is unchanged: no export is added, removed or renamed. Error messages that name a
package now use the new name. Update any code that matches on error text.

## Dependencies

- `@apollo/client` 4.2.12 → 4.3.8 in `indexer-public-data-provider` (#1701). It is the only direct runtime
  dependency that changed.

## Quick Migration

```bash
yarn remove @midnight-ntwrk/midnight-js
yarn add @midnightntwrk/midnight-js@5.0.2
```

Then change the imports. See [migration-guide.md](./migration-guide.md).

## Test Evidence

From this release on, the test evidence is attached to the GitHub Release (#1686):

- `test-evidence-v5.0.2.md` and `test-evidence-v5.0.2.tar.gz`: the test results of the run that
  published the packages.
- `published-packages-v5.0.2.txt`: the sha512 integrity of every published package. Compare it with
  `npm view <package>@5.0.2 dist.integrity`.

**Release run:** [run 44521457082](https://github.com/midnightntwrk/midnight-js/actions/runs/44521457082)
on `b874fa02f` (`chore(release): bump version to 5.0.2`). The `v5.0.2` tag points to the same commit.

| Suite | Tests | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Unit and integration tests, `packages/*` | 4605 | 4603 | 0 | 2 |
| Unit tests, `testkit-js` | 203 | 203 | 0 | 0 |
| End-to-end tests, current era (`devnet`) | 156 | 151 | 0 | 5 |
| End-to-end tests, ledger v8 era (`v8era`) | 25 | 25 | 0 | 0 |
| **Total** | **4989** | **4982** | **0** | **7** |

The eight Hard fork lanes and the Consumer E2E install smoke test also passed.

## Testing Checklist

- [ ] No `@midnight-ntwrk/midnight-js*` or `@midnight-ntwrk/testkit-js` name is left in your code or
      `package.json`
- [ ] No old copy is installed: `yarn why @midnight-ntwrk/midnight-js-types` finds nothing
- [ ] TypeScript compilation passes
- [ ] Unit and integration tests pass

---

**Last Updated:** November 24, 2026
**License:** Apache-2.0
