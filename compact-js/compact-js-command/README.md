# Compact.js (Command Line Utilities)

## Introduction

Provides an opinionated command line interface for Compact.js, allowing `compactc` compiled contracts to be
executed from the command line. The package exports commands that can be used programmatically within other
command line tools, or executed directly in its own process through its own CLI.

## Commands

### Prerequisites & Configuration

Since Compact.js commands operate over Compact compiled contracts, we need the following prerequisites in order
to execute them:

1. A `.compact` contract that has been compiled using the `compactc` compiler.  
The Compact compiler generates a JavaScript based _contract executable_ that will be the target of the invocations
made by the commands present in Compact.js. It also generates other assets that are required in order to fulfill
contract deployment and execution. Specifically, these are the TypeScript declaration file that describes the
contract, and the ZK file assets including prover and verifier keys.
2. With the above in place, we also need a configuration file (written in TypeScript), that:
   * Imports the _contract executable_ and makes it invocable via the `CompiledContract` and `ContractExecutable`
   types present in Compact.js,
   * Provides a type for private state, and a function that creates its initial value,
   * Provides the implementation of the Witnesses required by the contract, and,
   * Optionally provides some default configuration that can be set for all Compact.js commands.

An example configuration file for the canonical "Counter" contract is shown below:

```ts
import { CompiledContract, type Contract, ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
import { Contract as C_ } from './<path>/managed/counter/contract/index.cjs';

// The type of private state to use in contract execution.
type PrivateState = {
  count: number;
};

type CounterContract = C_<PrivateState>;
const CounterContract = C_;

// An implementation of the required Witnesses.
const witnesses: Contract.Contract.Witnesses<CounterContract> = {
  private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
}

// A function that creates the initial private state given to the contract when an instance is
// being deployed.
const createInitialPrivateState: () => PrivateState = () => ({
  count: 0
});

// The default export that describes the binding to the Contract.
export default {
  // Creates an executable from the imported contract, along with the assets it will require at runtime.
  contractExecutable: CompiledContract.make<CounterContract>('CounterContract', CounterContract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets('./<path>/managed/counter'),
    ContractExecutable.make
  ),
  createInitialPrivateState,
  config: {
    keys: {
      coinPublic: '...',
      signing: '...'
    },
    network: 'undeployed'
  }
}
```
**Note**: The `config` property is entirely optional along with its keys. The values can also be provided (or
overridden via precedence), via environment variables, or through the command line options documented below.

### Global Options

The following options can be used with all commands:

- `-c | --config pathToConfig`. The file path to the previously mentioned Contract Configuration file.  
Defaults to `'contract.config.ts'` in the current working folder.
- `-p | --coin-public key`. The user public key capable of receiving Zswap coins.  
The string can be hex or Bech32m encoded. Its value can also be specified using an environment variable named
`KEYS_COIN_PUBLIC`.
- `-n | --network networkId`. An optional network identifier.  
Defaults to the Midnight MainNet if not specified. Its value can also be specified using an environment variable named
`NETWORK`.

### `deploy` Command

```
<binName> deploy [-c ...]
                 [-p ...]
                 [-n ...]
                 [-s | --signing ...]
                 [--output ...]
                 [--output-ps ...]
                 [--output-zswap ...]
                 ...args
```

This command executes the contract constructor and generates a serialized `Intent` describing a contract deployment.
The constructor is executed with the given `...args`, and the serialized `Intent` is written to the `--output` file
path. The private state and Zswap local state is written to the `--output-ps` and `--output-zswap` file paths
respectively, both formatted as JSON.

#### Options

- `-s | --signing key`. An optional public BIP-340 signing key, hex encoded.  
If not provided, a sample signing key is used in order to create a valid Contract Maintenance Authority (CMA) but it
will not be available for use in future maintenance operations. Its value can also be specified using an environment
variable named `KEYS_SIGNING`.
- `--output pathToStateOutput`. The file path to where the serialized `Intent` data should be written.  
Defaults to `'output.bin'` in the current working folder.
- `--output-ps pathToPrivateStateOutput`. The file path to where the private state data should be written.  
Defaults to `'output.ps.json'` in the current working folder.
- `--output-zswap pathToZswapLocalStateOutput`. The file path to where the the local Zswap  state data should be written.  
Defaults to `'zswap.json'` in the current working folder.

### `circuit` Command

```
<binName> circuit [-c ...]
                  [-p ...]
                  [-n ...]
                  --input ...
                  --input-ps ...
                  [--input-zswap ...]
                  [--output ...]
                  [--output-ps ...]
                  [--output-zswap ...]
                  contractAddress,
                  circuitId,
                  ...args
```

Executes a circuit on the contract and generates a serialized `Intent` describing a contract call. The circuit is
executed with the given `...args` in the context of some prior state provided by the `--input` file path, and private
state found in the `--input-ps` file path. Optionally, Zswap data describing coins can be provided via a JSON file
via the `--input-ps` file path.

As with the previously described `'deploy'` command, the `--output-*` options provide file paths to the outputs in
the same way.

#### Options

- `--input pathToStateInput`. The required file path to the serialized state data.  
The state data is provided as part of the context given to the executing circuit.
- `--input-ps pathToPrivateStateInput`. The required file path to the private state data.  
Private state is provided to the associated Witness implementations.
- `--input-zswap pathToZswapLocalStateInput`. The file path to the the local Zswap state data.  
If not provided, then empty Zswap local state data will be provided to the circuit.
- `--output pathToStateOutput`. The file path to where the serialized `Intent` data should be written.  
Defaults to `'output.bin'` in the current working folder.
- `--output-ps pathToPrivateStateOutput`. The file path to where the private state data should be written.  
Defaults to `'output.ps.json'` in the current working folder.
- `--output-zswap pathToZswapLocalStateOutput`. The file path to where the the local Zswap state data should be written.  
Defaults to `'zswap.json'` in the current working folder.

### Contract Arguments

Compact allows contract constructors and circuits to receive arguments. As described in the
[Compact Language Reference](https://github.com/midnightntwrk/compactc/blob/main/doc/lang-ref.mdx#representations-in-typescript)
Compact types are mapped to TypeScript equivalents, and each command attempts to process its `...args` based on
the associated TypeScript type. Internally, the previously mentioned TypeScript declaration file (generated by
`compactc`), is reflected over to determine the required TypeScript argument types. Each argument provided in
`...args` is then parsed according to its TypeScript type before being presented to the Compact runtime.

#### Tuples & Objects

Tuples and object literals (Compact structs) can be written by enclosing them in quotes:
- `... "[100n, 200n, true]" ...`
- `... "{a: 100n, b: 200n, c: false}" ...`

Nested tuples and nested object literals are supported:
- `... "[100n, [200n, 300n], true]" ...`
- `... "{a: 100n, b: {bx: true, by: false}, c: false}" ...`
- `... "[100n, {a: 200n, b: false}, true]" ...`
- `... "{a: 100n, b: [true, false], c: false}" ...`

#### Strings

Since command line arguments are implicitly string types, you can pass them as is. Obviously, if the string has to
contain whitespace then it should be enclosed in quotes as it would for any command line argument:
- `... AString ...`
- `... "A longer string" ...`

When used in Tuple types or object literals, since the enclosing type requires enclosing quotes, strings should be
enclosed in single quotes:
- `... "[100n, 'AString']" ...`
- `... "[100n, 'A longer string']" ...`
- `... "{a: 100n, b: 'AString'}" ...`
- `... "{a: 100n, b: 'A longer string'}" ...`