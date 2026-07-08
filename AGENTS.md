# Contributor Guide for Midnight.js

Code style, testing patterns, and development workflows. For API reference and usage examples, see [llms.txt](./llms.txt).

## Code Style

### TypeScript

```typescript
// ✅ Use explicit types, avoid `any`
function processState(state: ContractState): ProcessedState { }

// ❌ Never use `any` or cast to `unknown`
function processState(state: any): any { }

// ✅ Use readonly for immutable data
interface Config {
  readonly networkId: string;
  readonly endpoints: readonly string[];
}

// ✅ Prefer union types over enums for simple cases
type TxStatus = 'pending' | 'confirmed' | 'failed';

```

### Naming Conventions

```typescript
// Interfaces: PascalCase, descriptive
interface PrivateStateProvider { }
interface DeployContractOptions { }

// Types: PascalCase
type ContractAddress = string;
type UnprovenTransaction = { /* ... */ };

// Functions: camelCase, verb-first
function deployContract() { }
function findDeployedContract() { }
function submitCallTx() { }

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT_MS = 300000;
const MAX_RETRY_ATTEMPTS = 3;

// Files: kebab-case
// private-state-provider.ts
// deploy-contract.ts
```

## Architecture Patterns

### Provider Pattern

All capabilities are abstracted into pluggable providers. Use factory functions to create them; see [llms.txt](./llms.txt) for full API examples and `packages/types/src/` for interface definitions.

Key `PrivateStateProvider` methods: `set()`, `get()`, `remove()`, `clear()`, `setSigningKey()`, `exportPrivateStates()`, `importPrivateStates()`.

### Error Handling

```typescript
// ✅ Use custom error classes
class ContractDeploymentError extends Error {
  constructor(
    message: string,
    public readonly contractAddress: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ContractDeploymentError';
  }
}

// ✅ Preserve error chains
try {
  await deployContract(options);
} catch (error) {
  throw new ContractDeploymentError(
    'Failed to deploy contract',
    address,
    error instanceof Error ? error : undefined
  );
}

// ❌ Don't swallow errors silently
try {
  await riskyOperation();
} catch {
  // Silent failure - BAD
}
```

### Async Patterns

```typescript
// ✅ Use RxJS for streams and subscriptions
function contractStateObservable(address: string): Observable<ContractState> {
  return new Observable(subscriber => {
    const subscription = pollForChanges(address, state => {
      subscriber.next(state);
    });
    return () => subscription.unsubscribe();
  });
}

// ✅ Use async/await for sequential operations
async function deployAndCall(): Promise<Result> {
  const deployed = await deployContract(options);
  const result = await deployed.callTx.initialize();
  return result;
}
```

## Testing Requirements

### Test Structure

```typescript
// ✅ Use Arrange-Act-Assert pattern
describe('deployContract', () => {
  it('should deploy contract with initial state', async () => {
    // Arrange
    const providers = createMockProviders();
    const options = { compiledContract, privateStateId: 'test' };

    // Act
    const deployed = await deployContract(providers, options);

    // Assert
    expect(deployed.contractAddress).toBeDefined();
    expect(deployed.callTx).toBeDefined();
  });
});
```

### Test Categories

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test provider interactions
3. **E2E Tests** - Test full transaction flows against network

### Testing Guidelines

```typescript
// ✅ Test meaningful scenarios, not implementation details
it('should encrypt state with provided password', async () => { });
it('should reject weak passwords', async () => { });

// ❌ Don't test internal methods or trivial getters
it('should call internal helper', async () => { }); // BAD

// ✅ Test error cases through behavior
it('should throw when contract address is invalid', async () => {
  await expect(findContract(invalidAddress))
    .rejects.toThrow(ContractNotFoundError);
});

// ✅ Use descriptive test names
it('should return undefined when private state does not exist', async () => { });
```

### Running Tests

```bash
# All tests
yarn test

# Specific package
yarn test --filter=@midnight-ntwrk/midnight-js-contracts

# Watch mode
yarn test --watch

# With coverage
yarn test --coverage
```

## Package-Specific Guidelines

### @midnight-ntwrk/midnight-js-types

- Define all shared interfaces here
- Export types that other packages depend on
- Keep type definitions minimal and focused

### @midnight-ntwrk/midnight-js-contracts

- High-level API for contract operations
- Functions should accept `MidnightProviders` as first argument
- Return well-typed results with transaction data

### @midnight-ntwrk/midnight-js-level-private-state-provider

- Security-critical: encryption, key derivation
- Use established crypto libraries only
- Never log sensitive data (passwords, keys, decrypted state)

### @midnight-ntwrk/midnight-js-indexer-public-data-provider

- GraphQL queries and subscriptions
- Handle network errors with retries
- Support both polling and real-time subscriptions

### @midnight-ntwrk/midnight-js-http-client-proof-provider

- HTTP communication with proof server
- Implement retry logic for transient failures
- Respect timeout configurations

### @midnight-ntwrk/midnight-js-dapp-connector-proof-provider

- Delegates proving to DApp Connector wallet
- Two abstraction levels: high-level (`dappConnectorProofProvider`) and low-level (`dappConnectorProvingProvider`)
- Minimal interface coupling via `Pick<WalletConnectedAPI, 'getProvingProvider'>`
- Proving provider is obtained once during setup and cached — do not re-obtain per call

### @midnight-ntwrk/midnight-js

- Barrel package re-exporting core modules (contracts, networkId, types, utils)
- Namespace exports via `index.ts` and sub-path exports for tree-shaking
- Changes to this package should only be structural (adding/removing re-exports)
- When adding a new core package, add both namespace export and sub-path export

## Common Tasks

### Adding a New Function to a Package

1. Define types in `types/` package if shared
2. Implement function with proper typing
3. Write unit tests first (TDD)
4. Export from package's index.ts
5. Update package README if public API
6. Run `yarn lint` and `yarn test`

### Creating a New Provider Implementation

1. Implement the provider interface from `types/`
2. Create factory function that returns provider
3. Handle all error cases
4. Write comprehensive tests
5. Document configuration options

### Modifying Transaction Flow

1. Understand current flow in `contracts/` package
2. Check impact on other packages
3. Update types if transaction shape changes
4. Test full flow with E2E tests

## Do's and Don'ts

### Do

- ✅ Run `yarn lint` before committing
- ✅ Write tests before implementation
- ✅ Use existing utility functions from `utils/`
- ✅ Follow existing patterns in the codebase
- ✅ Keep functions small and focused
- ✅ Document public APIs with JSDoc
- ✅ Handle edge cases explicitly

### Don't

- ❌ Use `any` type
- ❌ Cast to `unknown` to bypass type checking
- ❌ Add comments where code is self-explanatory
- ❌ Create abstractions for single-use cases
- ❌ Add dependencies without justification
- ❌ Ignore linting errors
- ❌ Write tests just for coverage metrics
- ❌ Log sensitive information

## Build and Lint

See [CLAUDE.md](./CLAUDE.md) for basic build/test/lint commands. Additional useful variants:

```bash
# Build specific package
yarn build --filter=@midnight-ntwrk/midnight-js-contracts

# Type check
yarn typecheck:tests
```

### Building compactc from the `compact/` submodule (feature branches)

See [DEVELOPMENT.md § Building compactc from the `compact/`
submodule](./DEVELOPMENT.md#building-compactc-from-the-compact-submodule) for
local setup and CI opt-in (`workflow_dispatch` input `compactc_source=submodule`
or PR label `compactc-from-source`).

## Commit Guidelines

Follow conventional commits:

```
feat(contracts): add batch deployment support
fix(private-state): handle encryption key rotation edge case
test(indexer): add integration tests for subscription reconnection
docs(readme): update quick start example
chore(deps): bump typescript to 6.0.3
```

## Package Dependencies

When adding dependencies:

1. Check if functionality exists in current deps
2. Prefer widely-used, maintained packages
3. Add to correct package (not root unless shared)
4. Update package.json with exact version for prod deps
5. Document why dependency was added

## Debugging Tips

### Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Type errors after changes | Missing type exports | Check index.ts exports |
| Test timeout | Network/async issues | Increase timeout, add mocks |
| Build fails | Circular dependency | Check import order |
| Lint errors | Style violations | Run `yarn lint:fix` |

### Useful Commands

```bash
# Run single test file
yarn test packages/contracts/src/__tests__/deploy.test.ts
```

## Questions to Ask

Before implementing, clarify:

1. Which package does this belong in?
2. Is this a breaking change to public API?
3. Are there existing patterns to follow?
4. What error cases need handling?
5. What tests are needed?

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RxJS Guide](https://rxjs.dev/guide/overview)
- [Vitest Documentation](https://vitest.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **midnight-js** (7286 symbols, 12344 relationships, 202 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/midnight-js/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/midnight-js/context` | Codebase overview, check index freshness |
| `gitnexus://repo/midnight-js/clusters` | All functional areas |
| `gitnexus://repo/midnight-js/processes` | All execution flows |
| `gitnexus://repo/midnight-js/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
