# Node ZK Config Provider

ZK configuration provider that reads proving keys, verifier keys, and ZK intermediate representation from the local filesystem. Designed for Node.js environments.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-node-zk-config-provider
```

## Quick Start

```typescript
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';

const zkConfigProvider = new NodeZkConfigProvider('/path/to/zk-artifacts');

const proverKey = await zkConfigProvider.getProverKey('myCircuit');
const verifierKey = await zkConfigProvider.getVerifierKey('myCircuit');
const zkir = await zkConfigProvider.getZKIR('myCircuit');
```

## Configuration

| Parameter   | Required | Description                                |
| ----------- | -------- | ------------------------------------------ |
| `directory` | ✓        | Base directory path for ZK artifact files  |

## API

### NodeZkConfigProvider

```typescript
class NodeZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(directory: string);

  getProverKey(circuitId: K): Promise<ProverKey>;
  getVerifierKey(circuitId: K): Promise<VerifierKey>;
  getZKIR(circuitId: K): Promise<ZKIR>;
}
```

## Directory Structure

The provider expects the following directory structure:

```
{directory}/
├── keys/
│   ├── {circuitId}.prover      # Prover key (binary)
│   └── {circuitId}.verifier    # Verifier key (binary)
└── zkir/
    └── {circuitId}.bzkir       # ZK intermediate representation (binary)
```

## Exports

```typescript
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
