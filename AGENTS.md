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

Key `PrivateStateProvider` methods: `forContract(address)` (returns `ContractPrivateStates` with `get()`, `set()`, `remove()`, `clear()`, `exportPrivateStates()`, `importPrivateStates()`), `clearAll()`, `setSigningKey()`, `getSigningKey()`.

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
function stateChanges(address: string): Observable<ContractState> {
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
yarn test --filter=@midnightntwrk/midnight-js-contracts

# Watch mode
yarn test --watch

# With coverage
yarn test --coverage
```

## Package-Specific Guidelines

### @midnightntwrk/midnight-js-types

- Define all shared interfaces here
- Export types that other packages depend on
- Keep type definitions minimal and focused

### @midnightntwrk/midnight-js-contracts

- High-level API for contract operations
- Functions should accept `MidnightProviders` as first argument
- Return well-typed results with transaction data

### @midnightntwrk/midnight-js-level-private-state-provider

- Security-critical: encryption, key derivation
- Use established crypto libraries only
- Never log sensitive data (passwords, keys, decrypted state)

### @midnightntwrk/midnight-js-indexer-public-data-provider

- GraphQL queries and subscriptions
- Handle network errors with retries
- Support both polling and real-time subscriptions

### @midnightntwrk/midnight-js-http-client-proof-provider

- HTTP communication with proof server
- Implement retry logic for transient failures
- Respect timeout configurations

### @midnightntwrk/midnight-js-dapp-connector-proof-provider

- Delegates proving to DApp Connector wallet
- Two abstraction levels: high-level (`dappConnectorProofProvider`) and low-level (`dappConnectorProvingProvider`)
- Minimal interface coupling via `Pick<WalletConnectedAPI, 'getProvingProvider'>`
- Proving provider is obtained once during setup and cached — do not re-obtain per call
- `dappConnectorWalletProviders` builds `WalletProvider` + `MidnightProvider` from `Pick<ConnectedAPI, 'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'>`, both eras; wallet errors are not wrapped here (contracts' `atProviderMethod` wraps them); `ttl` is not forwarded (connector has none)

### @midnightntwrk/midnight-js

- Barrel package re-exporting core modules (contracts, types, utils)
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

1. Implement the provider interface from `types/`. For `ProofProvider`, `WalletProvider` or `MidnightProvider`, build it with the `create*FromHandlers` factory: one handler per ledger era
2. Create factory function that returns provider
3. Handle all error cases
4. Write comprehensive tests
5. Document configuration options

### Modifying Transaction Flow

1. Understand current flow in `contracts/` package
2. Check impact on other packages
3. Keep transactions as handles (`UnprovenTx`, `UnboundTx`, `FinalizedTx`) in every public API from `types` up; a handle holds bytes; a ledger object lives only between `handle.deserialize({ v9: Transaction })` and `LedgerTransaction.seal` inside one function (ADR 0024)
4. Update types if transaction shape changes
5. Test full flow with E2E tests

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
yarn build --filter=@midnightntwrk/midnight-js-contracts

# Type check
yarn typecheck:tests
```

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
4. Update package.json with exact version for prod deps, except a native (WASM) package another dependency also declares: copy that dependency's range verbatim, so a consumer's install resolves one copy (`packages/protocol/src/test/native-package-ranges.test.ts` checks this)
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

## Architecture Decision Records (ADRs)

Architecturally significant decisions are recorded as ADRs in [`docs/adr/`](./docs/adr/).
This is a hard workflow requirement, not a suggestion.

### Read — MUST, before any architecture-affecting change

1. Browse the ADRs in [`docs/adr/`](./docs/adr/) — the files are the list.
2. Find any **Accepted** ADR relevant to what you are about to change.
3. Follow it. If your change would contradict an Accepted ADR, do **not**
   silently diverge — either keep the decision, or write a new ADR that
   supersedes it (see below) and call out the reversal in your PR.

### Create — MUST, when a change qualifies

Write a new ADR before implementing any of:

- Changes to provider interfaces in `packages/types/src` (breaks all downstream packages).
- Adding a provider implementation, or changing a provider's public shape.
- Adding a new runtime dependency, or swapping a core library (crypto, GraphQL client, etc.).
- Any breaking change to a package's exported public API (major version bump).

If unsure whether a change qualifies, it probably does — write the ADR.

### How

1. Copy [`docs/adr/template.md`](./docs/adr/template.md) to
   `docs/adr/NNNN-kebab-title.md` using the next sequential zero-padded number
   (list the directory to find the highest existing one).
2. Fill in Context / Decision / Consequences / Alternatives, marked `Accepted` —
   approving the PR is the acceptance, so ADRs land `Accepted`, not `Proposed`.
   There is no shared index to update, so ADR PRs never conflict with each other.
3. An ADR describes only the current decision. When a decision still stands but
   a detail changes (a name, a mechanism, a follow-up that landed), edit the ADR
   in place in the same PR as the code. Do not add amendment or changelog
   sections; git keeps the history.
4. To reverse a decision already on `main`, add a new ADR. Replace the old
   ADR's body with a short note naming the new one and set its status to
   `Superseded by ADR-NNNN`. Keep the file and never rename it: code and docs
   link to it.
5. An ADR that has not yet reached `main` has no published number — edit or
   delete it in place and close the numbering up behind it.

## GitNexus (optional)

These rules apply only if you have GitNexus installed and the repository has a
`.gitnexus/` index. Setup: [DEVELOPMENT.md](./DEVELOPMENT.md#optional-gitnexus-code-intelligence).

- Re-index with `npx gitnexus analyze --index-only` (add `--embeddings` when
  `.gitnexus/meta.json` shows `stats.embeddings > 0`). Without `--index-only`,
  analyze writes a generated section into this file and skills into the repository.
- Before editing a function, class or method, run `gitnexus_impact` (direction
  `upstream`) and report the blast radius; warn on HIGH or CRITICAL risk.
- Before committing, run `gitnexus_detect_changes` to confirm the change affects
  only the expected symbols.
- In a worktree the index is named after the folder: pass `repo: "<folder-name>"`.
- For exploring, debugging and refactoring, use the `gitnexus-*` skills.
