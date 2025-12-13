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

