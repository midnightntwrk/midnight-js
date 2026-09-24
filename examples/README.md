# Midnight.js Examples

Standalone TypeScript snippets showing common patterns with the SDK.
Each file is self-contained and can be run directly with `tsx`.

## Prerequisites

```bash
# Node.js >= 22
node -v

# Install tsx globally (or use npx)
npm install -g tsx

# Copy and configure the environment file
cp ../.env.example ../.env
# Edit ../.env with your endpoints and password
```

## Examples

| File | What it shows |
| ---- | ------------- |
| [`01-providers.ts`](./01-providers.ts) | Assemble the full `MidnightProviders` object |
| [`02-deploy-contract.ts`](./02-deploy-contract.ts) | Deploy a Compact contract and call a circuit |
| [`03-find-contract.ts`](./03-find-contract.ts) | Find and re-join an already-deployed contract |

## Running an example

```bash
cd examples
tsx 01-providers.ts
```
