# Contract Factory — Design Spec

## Problem

The current midnight-js SDK requires developers to manually assemble 6 providers and use verbose configuration objects to deploy and interact with contracts. Compared to Hardhat's `getContractFactory("Name").deploy()` pattern, the DX has a high barrier to entry.

## Goal

A thin `createContractFactory` wrapper that gives developers a Hardhat-like experience:
- Create a factory from compiled contract + providers
- `factory.deploy(opts)` — deploy and get a contract instance
- `factory.find(address, opts)` — attach to an existing contract
- `instance.callTx.method()` — call circuits (unchanged)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package | New `@midnight-ntwrk/midnight-js-contract-factory` | Clean separation, no changes to existing API |
| Provider handling | Accept pre-built `MidnightProviders` only | Node/browser provider split is a separate concern |
| Private state | Explicit at deploy/find time | Factory stays stateless, flexible per-operation |
| API style | `createContractFactory()` function | Aligns with midnight-js functional style |
| Find location | On the factory (`factory.find()`) | Factory holds compiledContract + providers, both needed for find |

## Package

**Name:** `@midnight-ntwrk/midnight-js-contract-factory`

**Dependencies:**
- `@midnight-ntwrk/midnight-js-contracts`
- `@midnight-ntwrk/midnight-js-types`
- `@midnight-ntwrk/compact-runtime`
- `@midnight-ntwrk/compact-js`

No provider implementation packages.

**Source layout:**
```
packages/contract-factory/
├── src/
│   ├── index.ts
│   ├── contract-factory.ts
│   ├── contract-instance.ts
│   └── types.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── rollup.config.mjs
```

## API

### `createContractFactory`

```typescript
function createContractFactory<C extends Contract.Any>(
  compiledContract: CompiledContract.CompiledContract<C, any>,
  providers: MidnightProviders<Contract.ProvableCircuitId<C>, PrivateStateId, Contract.PrivateState<C>>
): ContractFactory<C>;
```

### `ContractFactory<C>`

```typescript
type HasRequiredDeployOptions<C extends Contract.Any> =
  DeployOptionsArgs<C> & DeployOptionsPrivateState<C> extends Record<string, never>
    ? false
    : true;

type ContractFactory<C extends Contract.Any> = {
  deploy(
    ...args: HasRequiredDeployOptions<C> extends true
      ? [options: DeployOptions<C>]
      : [options?: DeployOptions<C>]
  ): Promise<ContractInstance<C>>;
  find(address: ContractAddress, options?: FindOptions<C>): Promise<ContractInstance<C>>;
};
```

`deploy()` options are **required** when the contract has constructor args or private state. They are optional only for stateless, zero-arg contracts.

### `DeployOptions<C>`

TypeScript enforces both constructor arguments and private state requirements at compile time.

Constructor `args` are conditionally required when `Contract.InitializeParameters<C>` is non-empty.
Private state fields are conditionally required when `Contract.PrivateState<C>` is not `undefined`.

```typescript
type DeployOptionsArgs<C extends Contract.Any> =
  Contract.InitializeParameters<C> extends []
    ? {}
    : { readonly args: Contract.InitializeParameters<C> };

type DeployOptionsPrivateState<C extends Contract.Any> =
  Contract.PrivateState<C> extends undefined
    ? {}
    : {
        readonly initialPrivateState: Contract.PrivateState<C>;
        readonly privateStateId: PrivateStateId;
      };

type DeployOptions<C extends Contract.Any> =
  DeployOptionsArgs<C> & DeployOptionsPrivateState<C> & {
    readonly signingKey?: SigningKey;
  };
```

**Note:** `privateStateId` is **required** (not optional) when private state is provided. This matches the underlying `DeployContractOptionsWithPrivateState` type. The original idea of auto-generating from contract address is dropped because `deployContract` needs `privateStateId` before the address is known.

Field naming uses `initialPrivateState` consistently across both `deploy()` and `find()`, matching the underlying API.

### `FindOptions<C>`

```typescript
type FindOptionsBase = {
  readonly signingKey?: SigningKey;
};

type FindOptionsWithExistingPrivateState = FindOptionsBase & {
  readonly privateStateId: PrivateStateId;
};

type FindOptionsWithNewPrivateState<C extends Contract.Any> = FindOptionsBase & {
  readonly privateStateId: PrivateStateId;
  readonly initialPrivateState: Contract.PrivateState<C>;
};

type FindOptions<C extends Contract.Any> =
  Contract.PrivateState<C> extends undefined
    ? FindOptionsBase | void
    : FindOptionsWithExistingPrivateState | FindOptionsWithNewPrivateState<C>;
```

This mirrors the 3-variant structure of the underlying `FindDeployedContractOptions`:
1. No private state fields (stateless contracts)
2. `privateStateId` only (load existing private state)
3. `privateStateId` + `initialPrivateState` (store new private state)

`initialPrivateState` without `privateStateId` is prevented at the type level.

### `ContractInstance<C>`

```typescript
type ContractInstance<C extends Contract.Any> = {
  readonly address: ContractAddress;
  readonly callTx: CircuitCallTxInterface<C>;
  readonly circuitMaintenanceTx: CircuitMaintenanceTxInterfaces<C>;
  readonly contractMaintenanceTx: ContractMaintenanceTxInterface;
  readonly deployTxData: FinalizedDeployTxDataBase<C>;
};
```

`address` is promoted to a top-level property for convenience (currently accessed via `deployTxData.public.contractAddress`).

**Intentional narrowing:** `deployTxData` uses `FinalizedDeployTxDataBase<C>` (not the full `FinalizedDeployTxData<C>`) so that `deploy()` and `find()` return the same type. The extra fields from `FinalizedDeployTxData<C>` (`unprovenTx`, `initialZswapState`) are low-level internals not needed for typical usage. Users who need them should use `deployContract` directly.

## Implementation

### `createContractFactory`

```typescript
function createContractFactory<C extends Contract.Any>(
  compiledContract: CompiledContract.CompiledContract<C, any>,
  providers: MidnightProviders<Contract.ProvableCircuitId<C>, PrivateStateId, Contract.PrivateState<C>>
): ContractFactory<C> {
  return {
    async deploy(options?: DeployOptions<C>): Promise<ContractInstance<C>> {
      // Delegates to deployContract() from @midnight-ntwrk/midnight-js-contracts
      // Maps DeployOptions → DeployContractOptions
      // Returns ContractInstance with address promoted
    },

    async find(address: ContractAddress, options?: FindOptions<C>): Promise<ContractInstance<C>> {
      // Delegates to findDeployedContract() from @midnight-ntwrk/midnight-js-contracts
      // Maps FindOptions → FindDeployedContractOptions
      // Returns ContractInstance with address promoted
    },
  };
}
```

### Options Mapping

`deploy()` maps `DeployOptions` → existing `DeployContractOptions`:
- `compiledContract` — from factory closure
- `args` — passed through (conditionally present based on contract type)
- `signingKey` — passed through
- `initialPrivateState` — passed through
- `privateStateId` — passed through

**Overload dispatch:** The implementation must handle the `deployContract` overload for stateless contracts (`Contract<undefined>`, using `ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>`) vs stateful contracts internally. This is done by checking whether `privateStateId` is present in options.

`find()` maps `FindOptions` → existing `FindDeployedContractOptions`:
- `compiledContract` — from factory closure
- `contractAddress` — from `find(address, ...)`
- `privateStateId`, `initialPrivateState`, `signingKey` — passed through

**Note:** Constructor `args` are only relevant for `deploy()`. The `find()` path retrieves an already-deployed contract and does not execute the constructor.

### ContractInstance Construction

Both `deploy()` and `find()` return the same shape. The underlying `deployContract`/`findDeployedContract` already return `callTx`, `circuitMaintenanceTx`, `contractMaintenanceTx`, and `deployTxData`. The factory extracts `address` from `deployTxData.public.contractAddress`.

**Type narrowing:** `deployContract` returns `FinalizedDeployTxData<C>` (full type with extra private fields), while `findDeployedContract` returns `FinalizedDeployTxDataBase<C>`. The factory's `deploy()` must narrow `deployTxData` to `FinalizedDeployTxDataBase<C>` to match the unified `ContractInstance` type. This is done by extracting only the base fields (`public`, `private.signingKey`, etc.) from the full deploy result.

## Error Handling

No new error types. All errors from the underlying functions propagate:
- `DeployTxFailedError` — from `deploy()`
- `CallTxFailedError` — from `callTx.*`
- `ContractTypeError` — from `find()` when verifier keys mismatch
- `IncompleteFindContractPrivateStateConfig` — from `find()` when private state config is missing

## Concurrency Note

The factory is stateless, but if two `deploy()` calls run concurrently against the same `providers` object, internal provider state (e.g., `privateStateProvider`) could interleave. This is an existing limitation of the underlying API, not introduced by the factory. Avoid `Promise.all([factory.deploy(...), factory.deploy(...)])` patterns.

## Testing Strategy

**Unit tests** (in `packages/contract-factory`):
- Factory correctly delegates to `deployContract` with mapped options
- Factory correctly delegates to `findDeployedContract` with mapped options
- `args` correctly passed through for contracts with constructor parameters
- `privateState` correctly mapped to `initialPrivateState`
- `ContractInstance` shape has `address` promoted
- TypeScript compile-time enforcement of private state options (type-level tests)
- TypeScript compile-time enforcement of constructor args (type-level tests)
- Stateless contract (no private state) — `deploy()` works with no options

**Integration tests** (in `testkit-js-e2e`):
- Full deploy → call → find → call flow using existing test infrastructure

## Usage Examples

### Deploy and interact (stateful contract)

```typescript
const factory = createContractFactory(CompiledCounter, providers);

const counter = await factory.deploy({
  initialPrivateState: { count: 0n },
  privateStateId: 'counter-1',
});

console.log(counter.address); // 'cn...'
await counter.callTx.increment(5);
```

### Deploy with constructor arguments

```typescript
const factory = createContractFactory(CompiledToken, providers);

const token = await factory.deploy({
  args: [ownerAddress, 1_000_000n],
});
```

### Find existing contract

```typescript
const factory = createContractFactory(CompiledCounter, providers);

const counter = await factory.find('cn...existing-address', {
  privateStateId: 'my-counter',
});

await counter.callTx.increment(3);
```

### Stateless contract (no args, no private state)

```typescript
const factory = createContractFactory(CompiledRegistry, providers);
const registry = await factory.deploy();
await registry.callTx.register(name);
```

### Testing

```typescript
const providers = initializeMidnightProviders(wallet, envConfig, contractConfig);
const factory = createContractFactory(CompiledCounter, providers);

const counter = await factory.deploy({
  initialPrivateState: { count: 0n },
  privateStateId: 'test-counter',
});
const result = await counter.callTx.increment(1);
expect(result.public.txHash).toBeDefined();

const found = await factory.find(counter.address, {
  privateStateId: 'test-counter-found',
});
expect(found.address).toEqual(counter.address);
```
