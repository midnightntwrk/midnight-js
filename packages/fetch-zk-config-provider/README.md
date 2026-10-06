# Fetch ZK Config Provider

ZK configuration provider that retrieves proving keys, verifier keys, and ZK intermediate representation over HTTP/HTTPS. Designed for browser environments.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-fetch-zk-config-provider
```

## Quick Start

```typescript
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';

const zkConfigProvider = new FetchZkConfigProvider('https://example.com/zk-artifacts');

const proverKey = await zkConfigProvider.getProverKey('myCircuit');
const verifierKey = await zkConfigProvider.getVerifierKey('myCircuit');
const zkir = await zkConfigProvider.getZKIR('myCircuit');
```

## Configuration

| Parameter   | Required | Description                                           |
| ----------- | -------- | ----------------------------------------------------- |
| `baseURL`   | ✓        | Base URL for ZK artifact server (http:// or https://) |
| `fetchFunc` |          | Custom fetch function (defaults to cross-fetch)       |

## API

### FetchZkConfigProvider

```typescript
class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(baseURL: string, fetchFunc?: typeof fetch);

  getProverKey(circuitId: K): Promise<ProverKey>;
  getVerifierKey(circuitId: K): Promise<VerifierKey>;
  getZKIR(circuitId: K): Promise<ZKIR>;
}
```

## Directory Structure

The provider expects the following URL structure on the server:

```
{baseURL}/
├── compiler/
│   ├── contract-manifest.json  # Integrity manifest (compactc 0.33 and later)
│   └── contract-info.json      # Compiler description, carries runtime-version
├── keys/
│   ├── {circuitId}.prover      # Prover key (binary)
│   └── {circuitId}.verifier    # Verifier key (binary)
└── zkir/
    └── {circuitId}.bzkir       # ZK intermediate representation (binary)
```

`compiler/` is what lets the framework establish which ledger era a contract's
artifacts belong to. The integrity manifest is preferred, because
`expectedManifestHash` pins it to a digest the application controls;
`contract-info.json` is the fallback for bundles built before compactc emitted a
manifest, and it is verified against the manifest whenever one is present. A
bundle that ships neither can still serve keys and ZKIR, but cannot be used with
retained-era (pre-fork) contracts.

## Exports

```typescript
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
