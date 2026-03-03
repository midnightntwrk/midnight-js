# Midnight.js

TypeScript SDK for building privacy-preserving dApps on the Midnight blockchain.

## Tech Stack

- **Language**: TypeScript 5.8.x
- **Runtime**: Node.js >=22
- **Package Manager**: Yarn 4.x
- **Build**: Turbo monorepo, Rollup
- **Testing**: Vitest
- **Linting**: ESLint 9.x

## Project Structure

```
packages/           # Core SDK packages
testkit-js/         # Testing infrastructure
build-tools/        # Build configuration
```

## Commands

```bash
yarn build          # Build all packages
yarn test           # Run tests
yarn lint           # Check linting
yarn lint:fix       # Auto-fix linting
yarn e2e            # Run E2E tests
```

## Code Principles

- **TDD**: Write tests first, then implementation
- **KISS**: Favor simplicity over complexity
- **DRY**: Don't repeat yourself - extract shared logic
- **YAGNI**: Only build what's actually needed now
- **No `any`**: Use proper types, never cast to `any` or `unknown`
- **Self-documenting**: Code should be readable without comments

## Code Standards

- Arrange-Act-Assert pattern in tests
- Meaningful tests only - not for coverage metrics
- Test errors through negative scenarios
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- Run `yarn lint` before committing

## Type Safety

```typescript
// ✅ Good
function process(state: ContractState): Result { }

// ❌ Bad - never use any
function process(state: any): any { }
```

## Error Handling

```typescript
// ✅ Preserve error chain
throw new CustomError('message', { cause: error });

// ❌ Don't swallow errors
catch { /* silent */ }
```

## Detailed Guidelines

- [AGENTS.md](./AGENTS.md) - Contributor guide: code style, testing, patterns, workflows
- [llms.txt](./llms.txt) - API reference: packages, interfaces, usage examples
