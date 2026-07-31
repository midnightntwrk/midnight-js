# Bundled Contract Module Provider

Resolves a cross-contract callee to one of the compiled contract modules bundled with your
application.

A deployment puts no code on chain, so nothing on chain says which module implements the contract at
an address — the application does, by listing the ones it ships. This provider turns that list into
the `ContractModuleProvider` the Compact runtime consults at each cross-contract call.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-bundled-contract-module-provider
```

## Quick Start

```typescript
import {
  bundledContractModuleProvider,
  type ModulesByAddress
} from '@midnight-ntwrk/midnight-js-bundled-contract-module-provider';

// Generated: literal `import()` specifiers, so a bundler splits each implementation into its own
// chunk and fetches it only if a call reaches that address.
const MODULES_BY_ADDRESS: ModulesByAddress = new Map([
  ['0200d4...', () => import('./managed/dex/contract/index.js')],
  ['0200a1...', () => import('./managed/token/contract/index.js')]
]);

const providers = {
  // ...the rest of your providers
  contractModuleProvider: bundledContractModuleProvider(MODULES_BY_ADDRESS)
};
```

The table is read once, when the provider is built, so keys are validated then rather than at the
call: a mistyped address is otherwise indistinguishable from one with nothing deployed at it. Two
keys differing only in case are an error unless they name the same module.

An address the table does not hold resolves to `undefined`, which the runtime reports as an
unsupported implementation, naming the call it could not bind.
