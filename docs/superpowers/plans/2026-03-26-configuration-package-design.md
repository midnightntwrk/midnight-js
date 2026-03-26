# Design: `@midnight-ntwrk/midnight-js-configuration`

A centralized configuration package for the Midnight.js SDK, replacing `@midnight-ntwrk/midnight-js-network-id` and adding TTL support.

## Motivation

The current SDK has two configuration pain points:

1. **Network ID** is managed via global module-level state in a standalone package (`network-id`). It works but is not extensible.
2. **TTL** is hardcoded to 1 hour (`ttlOneHour()`) in `ledger-utils.ts` for all transaction types (deploy, call, maintenance). There is no way for dApp developers to configure this value.

A single configuration package solves both by providing a unified, type-safe, extensible entry point for SDK-wide settings.

## Scope

**In scope:**
- Network ID (replacing `network-id` package)
- Transaction TTL with a sensible default (1 hour)

**Out of scope:**
- Provider URLs (obtained from wallet via `getConfiguration()`)
- Log level, proof provider timeout, or other provider-specific settings
- Per-transaction-type TTL defaults (API designed to allow this later)

## Package Identity

- **Package name:** `@midnight-ntwrk/midnight-js-configuration`
- **Location:** `packages/configuration/`
- **Production dependencies:** None

## Public API

### Types

```typescript
type NetworkId = string;

interface MidnightJsConfiguration {
  readonly networkId: NetworkId;
  readonly ttl: number; // milliseconds
}

type MidnightJsConfigurationInput = {
  networkId: NetworkId;
  ttl?: number; // optional, defaults to 3_600_000 (1 hour)
};
```

### Functions

```typescript
// Set initial configuration. Throws if already configured.
configure(options: MidnightJsConfigurationInput): void;

// Update configuration. Throws if NOT yet configured.
reconfigure(options: Partial<MidnightJsConfigurationInput>): void;

// Get the full config object. Throws if not configured.
getConfiguration(): MidnightJsConfiguration;

// Convenience getters
getNetworkId(): NetworkId;
getTtl(): Date; // returns new Date(Date.now() + ttl) each call
```

### Design Decisions

- `ttl` is stored as **milliseconds** (number) but `getTtl()` returns a **Date**, matching the existing `Intent.new(date)` API contract.
- `reconfigure()` accepts `Partial` so a single field can be updated (e.g., only `networkId` on network switch).
- `configure()` throws if called twice, forcing explicit `reconfigure()` for intent clarity.
- `NetworkId` type is re-exported for backward compatibility.
- Default TTL is 3,600,000 ms (1 hour), matching the current hardcoded behavior.

## Error Handling

Three distinct error scenarios:

| Scenario | Error Message |
|----------|---------------|
| Getter called before `configure()` | `Midnight.js has not been configured. Call configure() before any wallet or contract operation.` |
| `configure()` called when already configured | `Midnight.js is already configured. Use reconfigure() to update configuration.` |
| `reconfigure()` called before `configure()` | `Midnight.js has not been configured. Call configure() before reconfigure().` |

### Input Validation

Applied on both `configure()` and `reconfigure()`:

| Field | Rule | Error Message |
|-------|------|---------------|
| `networkId` | Non-empty string | `networkId must be a non-empty string.` |
| `ttl` | Positive number | `ttl must be a positive number in milliseconds.` |

No silent failures. Every misconfiguration produces a loud, descriptive error.

## Migration & Backward Compatibility

### Deprecation of `@midnight-ntwrk/midnight-js-network-id`

The old package becomes a thin wrapper delegating to the new configuration package:

```typescript
// network-id/src/index.ts (updated)
import {
  configure,
  reconfigure,
  getNetworkId as getConfigNetworkId,
} from '@midnight-ntwrk/midnight-js-configuration';

/** @deprecated Use configure() from @midnight-ntwrk/midnight-js-configuration */
export const setNetworkId = (id: NetworkId): void => {
  try {
    configure({ networkId: id });
  } catch {
    reconfigure({ networkId: id });
  }
};

/** @deprecated Use getNetworkId() from @midnight-ntwrk/midnight-js-configuration */
export const getNetworkId = (): NetworkId => getConfigNetworkId();

export type { NetworkId } from '@midnight-ntwrk/midnight-js-configuration';
```

### Internal Migration

| Package | Change |
|---------|--------|
| `contracts` | Switch imports from `network-id` to `configuration` |
| `utils` | Deprecate `ttlOneHour()` in `date-utils.ts` |
| `contracts/ledger-utils.ts` | Replace `ttlOneHour()` with `getTtl()` |
| `barrel package` | Add `export * as configuration`, keep deprecated `networkId` export |
| `testkit` | Switch imports to `configuration` |

### Consumer Impact

Existing dApps using `setNetworkId()` / `getNetworkId()` continue to work unchanged. Migration is opt-in.

## Testing Strategy

### Unit Tests (configuration package)

**Happy path:**
1. `configure()` sets values, `getConfiguration()` returns them
2. `configure()` with only `networkId` uses default TTL (3,600,000 ms)
3. `getNetworkId()` returns configured network ID
4. `getTtl()` returns a Date in the future (now + configured ttl)
5. `reconfigure()` updates single field, preserves others
6. `reconfigure()` updates all fields

**Error scenarios:**
7. `getConfiguration()` throws before `configure()`
8. `getNetworkId()` throws before `configure()`
9. `getTtl()` throws before `configure()`
10. `configure()` throws when called twice
11. `reconfigure()` throws before `configure()`
12. `configure()` with empty string networkId throws
13. `configure()` with negative ttl throws
14. `configure()` with zero ttl throws
15. `reconfigure()` with empty string networkId throws
16. `reconfigure()` with negative ttl throws

### Deprecation Wrapper Tests (network-id package)

17. `setNetworkId()` delegates to `configure()` on first call
18. `setNetworkId()` delegates to `reconfigure()` on subsequent calls
19. `getNetworkId()` delegates to configuration package

### Integration

20. `ledger-utils.ts` uses `getTtl()` — covered by existing contract tests

All tests use `vi.resetModules()` + dynamic imports to isolate module-level state.

## File Structure

```
packages/configuration/
  src/
    index.ts                 # Public API exports
    configuration.ts         # Types
    test/
      index.test.ts          # Unit tests
  package.json
  tsconfig.json
  tsconfig.build.json
  rollup.config.mjs
  vitest.config.ts
  typedoc.json
```
