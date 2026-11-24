# Release Notes v5.0.2

**Release Date:** November 19, 2026
**Previous Version:** v5.0.1
**Node.js Requirement:** >=22.12

v5.0.2 changes how the packages are named and published. The package code is the same as in v5.0.1,
apart from the new package names.

## Breaking Changes

### New npm scope: `@midnightntwrk` (#1689)

All packages of this repository moved from `@midnight-ntwrk/*` to `@midnightntwrk/*`:

| v5.0.1 | v5.0.2 |
| --- | --- |
| `@midnight-ntwrk/midnight-js` | `@midnightntwrk/midnight-js` |
| `@midnight-ntwrk/midnight-js-<name>` | `@midnightntwrk/midnight-js-<name>` |
| `@midnight-ntwrk/testkit-js` | `@midnightntwrk/testkit-js` |

- 5.0.2 is published only under `@midnightntwrk/*`. No new versions are published under
  `@midnight-ntwrk/*`; its last version stays 5.0.1.
- Dependencies from other repositories keep their names: `@midnight-ntwrk/compact-runtime`,
  `@midnight-ntwrk/compact-js`, `@midnight-ntwrk/platform-js`, `@midnight-ntwrk/onchain-runtime-v3`
  and the `@midnightntwrk/*` packages that already used the new scope in v5.0.0.
- The runtime keys `Symbol.for('@midnight-ntwrk/midnight-js#…')` are unchanged. They identify objects,
  not packages.

See [migration-guide.md](./migration-guide.md).

## Publishing

- **npmjs with provenance** (#1689). The packages are published to npmjs with OIDC trusted publishing.
  Each version has an npm provenance statement that links it to the CI run that built it.
- **No GitHub Packages alias** (#1702). The `@midnight-ntwrk/*` copy on GitHub Packages is no longer
  published.
- **Package metadata** (#1689). Every `package.json` now has `repository` (pointing to
  `midnightntwrk/midnight-js`), `homepage` and `bugs`. `author` is `Midnight Foundation`.
- **Test evidence on the GitHub Release** (#1686). The release has the test results of the publishing
  run and the sha512 integrity of every published package. See the
  [README](./README.md#test-evidence).

## Dependencies

- `@apollo/client` 4.2.12 → 4.3.8 in `indexer-public-data-provider` (#1701).
- Build and test tools only: `rollup` 4.68, `@vitest/coverage-v8` 5.1.0, `@vitest/ui` 5.0.5,
  `rimraf` 6.1.4 (#1701).
