# AI Agent Guidelines for Midnight.js

This document provides guidance for AI coding assistants working with the Midnight.js codebase.

## Project Context

Midnight.js is a TypeScript SDK for the Midnight blockchain - a privacy-focused network using zero-knowledge proofs. The SDK enables developers to build dApps that combine public blockchain operations with private local computation.

**Key Domain Concepts:**
- Zero-knowledge proofs for privacy
- Encrypted local state management
- Smart contract deployment and interaction
- Transaction lifecycle (unproven → proven → balanced → submitted → finalized)

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.8.x | Language |
| Node.js | >=22 | Runtime |
| Yarn | 4.x | Package manager |
| Turbo | 2.8.x | Monorepo orchestration |
| Vitest | 4.x | Testing framework |
| ESLint | 9.x | Linting |
| Rollup | 4.x | Bundling |

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

// ✅ Use Result pattern for operations that can fail
type Result<T, E> = { success: true; value: T } | { success: false; error: E };
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

All capabilities are abstracted into pluggable providers:

```typescript
// ✅ Implement provider interfaces
interface PrivateStateProvider {
  get<T>(id: string): Promise<T | undefined>;
  set<T>(id: string, state: T): Promise<void>;
  remove(id: string): Promise<void>;
}

// ✅ Factory functions for provider creation
function levelPrivateStateProvider(options: Options): PrivateStateProvider {
  return {
    get: async (id) => { /* ... */ },
    set: async (id, state) => { /* ... */ },
    remove: async (id) => { /* ... */ }
  };
}
```

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

```bash
# Build all packages
yarn build

# Build specific package
yarn build --filter=@midnight-ntwrk/midnight-js-contracts

# Lint check
yarn lint

# Lint fix
yarn lint:fix

# Type check
yarn typecheck
```

## Commit Guidelines

Follow conventional commits:

```
feat(contracts): add batch deployment support
fix(private-state): handle encryption key rotation edge case
test(indexer): add integration tests for subscription reconnection
docs(readme): update quick start example
chore(deps): bump typescript to 5.8.3
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
# Check for circular dependencies
yarn madge --circular packages/*/src

# Analyze bundle size
yarn analyze

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
