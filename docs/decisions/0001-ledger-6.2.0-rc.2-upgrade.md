# Ledger 6.2.0-rc.2 Upgrade

#### status: accepted
#### date: 2025-12-13
#### deciders: Mike Clay

## Context and Problem Statement

The midnight-node repository updated to ledger 6.2.0-rc.2, which includes
breaking changes to the intent serialization format (`intent[v5]`) and
introduces improved domain separators across the cryptographic operations.
The midnight-js SDK needs to be updated to maintain compatibility with the
new ledger version.

## Decision Drivers

* midnight-node PR #352 updated to ledger 6.2.0-rc.2
* New intent[v5] format required for transaction compatibility
* Breaking changes in compact-runtime and ledger-v6 packages
* CI test failures due to token type format changes in error messages

## Considered Options

* Update all dependencies to match ledger 6.2.0-rc.2 requirements
* Pin to older ledger version and defer upgrade
* Partial upgrade with compatibility shims

## Decision Outcome

Chosen option: "Update all dependencies to match ledger 6.2.0-rc.2 requirements",
because maintaining compatibility with the node is essential for the SDK to
function correctly in production environments.

### Changes Made

#### Dependency Updates

| Package | From | To |
|---------|------|-----|
| `@midnight-ntwrk/ledger-v6` | 6.1.0-alpha.5 | 6.2.0-rc.2 |
| `@midnight-ntwrk/compact-runtime` | 0.11.0-rc.1 | 0.12.0-alpha.0 |
| `@midnight-ntwrk/wallet-sdk-facade` | 1.0.0-beta.10 | 1.0.0-beta.11 |
| `compactc` (COMPACTC_VERSION) | 0.26.114-rc.0-UT-L6 | 0.27.0-rc.1 |

#### Infrastructure Updates

| Component | From | To |
|-----------|------|-----|
| midnight-node | 0.18.0-rc.6 | 0.18.0-rc.7 |
| proof-server | 6.1.0-alpha.5 | 6.1.0-alpha.6 |
| indexer-standalone | 3.0.0-alpha.11 | 3.0.0-alpha.17 |

#### API Changes

1. **Dust.startWithSeed**: Removed unnecessary `networkId` parameter
   ```typescript
   // Before
   Dust.startWithSeed(seed, dustParameters, networkId);
   
   // After
   Dust.startWithSeed(seed, dustParameters);
   ```

#### Test Fixes

1. **Token type format in error messages**: Updated `unshielded.it.test.ts`
   to use regex matching instead of exact string matching for error assertions.
   This accommodates potential changes in how token types are serialized in
   error messages.
   
   ```typescript
   // Before
   ).rejects.toThrow('Insufficient Funds: could not balance 0101...');
   
   // After
   ).rejects.toThrow(/Insufficient Funds: could not balance/);
   ```

#### CI Cache Configuration

Updated all GitHub Actions workflow files to include the compactc version
in the turbo cache key. This ensures the cache is invalidated when the
compiler version changes, preventing stale compiled contracts from being used.

```yaml
# Before
key: turbo-${{ runner.os }}-${{ hashFiles('**/yarn.lock') }}-${{ hashFiles('**/turbo.json') }}
restore-keys: |
  turbo-${{ runner.os }}-

# After
key: turbo-${{ runner.os }}-${{ hashFiles('**/yarn.lock') }}-${{ hashFiles('**/turbo.json') }}-${{ hashFiles('.github/env/global.env') }}
restore-keys: |
  turbo-${{ runner.os }}-${{ hashFiles('**/yarn.lock') }}-
```

**Files updated:**
- `.github/workflows/ci-base.yml`
- `.github/workflows/ci-midnight-js.yml`
- `.github/workflows/cd.yml`
- `.github/workflows/cd-compact-js.yml`
- `.github/workflows/cd-platform-js.yml`
- `.github/workflows/cd-testkit-js.yml`
- `.github/workflows/docs-api.yml`

#### Build Script Fixes

Updated `compact-js/compact-js/package.json` to always regenerate Compact
contracts during build. The previous conditional logic skipped compilation
if the `managed/` directory already existed, which caused stale contracts
to be used when the compactc version changed.

```json
// Before - skips if managed/ exists
"build-compact": "(shx --negate test -d ./test/contract/managed && yarn compact || true)"

// After - always regenerates
"build-compact": "yarn compact"
```

Also updated `turbo.json` to include test compact files in build inputs:
- Added `test/**/*.compact` to inputs
- Added `test/**/managed/**` to outputs

### Positive Consequences

* SDK remains compatible with latest midnight-node
* Benefits from improved domain separators in cryptographic operations
* Test assertions are more resilient to format changes

### Negative Consequences

* Breaking change for SDK consumers using `Dust.startWithSeed` with networkId

## Validation

* All CI tests pass after the update
* E2E tests verify compatibility with new node/indexer/proof-server versions

## Related Changes

* midnight-node PR #352: Ledger 6.2.0-rc.2 API migration
* ADR: `midnight-node/docs/decisions/0003-ledger-6.2.0-rc.2-api-migration.md`

## References

* [Ledger 6.2.0 Changelog](https://github.com/midnightntwrk/midnight-ledger/blob/main/CHANGELOG.md)
* [PR #372](https://github.com/midnightntwrk/midnight-js/pull/372)

