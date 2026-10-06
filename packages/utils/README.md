# Utils

Shared utility functions for all Midnight.js modules.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-utils
```

## Quick Start

```typescript
import {
  toHex,
  fromHex,
  assertDefined,
  assertIsContractAddress
} from '@midnight-ntwrk/midnight-js-utils';

// Convert bytes to hex
const hex = toHex(new Uint8Array([0xab, 0xcd])); // 'abcd'

// Convert hex to bytes
const bytes = fromHex('abcd');

// Assert value is defined
assertDefined(maybeValue, 'Value must be defined');

// Validate contract address
assertIsContractAddress(address);
```

## API

### Hex Utilities

```typescript
// Convert bytes to hex string
toHex(bytes: Uint8Array): string

// Convert hex string to bytes
fromHex(str: string): Buffer

// Check if string is valid hex
isHex(source: string, byteLen?: number): boolean

// Assert string is valid hex
assertIsHex(source: string, byteLen?: number): asserts source is string

// Parse hex string details
parseHex(source: string): ParsedHexString

type ParsedHexString = {
  hasPrefix: boolean;      // Has '0x' prefix
  byteChars: string;       // Valid hex byte characters
  incompleteChars: string; // Invalid or incomplete characters
}
```

### Bech32m Key Parsing

```typescript
// Parse coin public key (Bech32m or hex) to hex
parseCoinPublicKeyToHex(possibleBech32: string, zswapNetworkId: NetworkId): string

// Parse encryption public key (Bech32m or hex) to hex
parseEncPublicKeyToHex(possibleBech32: string, zswapNetworkId: NetworkId): string
```

### Assertion Utilities

```typescript
// Assert value is non-null/undefined
assertDefined<A>(
  value: A | null | undefined,
  message?: string
): asserts value is NonNullable<A>

// Assert value is null/undefined
assertUndefined<A>(
  value: A | null | undefined,
  message?: string
): asserts value is undefined | null

// Close the `default` arm of a switch over a discriminated union. Compiles only
// while the switch is exhaustive; `context` names the switch and is required.
assertNever(value: never, context: string): never
```

### Type Utilities

```typescript
// Assert valid contract address format (32 bytes hex, no prefix)
assertIsContractAddress(
  contractAddress: string
): asserts contractAddress is ContractAddress
```

### Date Utilities

```typescript
// Get Date one hour from now (for TTL)
ttlOneHour(): Date
```

### Error Codes and Guards

```typescript
// Per-layer error-code registries (each frozen; values are string literals)
CONTRACTS_ERROR_CODES
PROVIDER_ERROR_CODES
UTILS_ERROR_CODES
// Protocol-layer codes are not re-exported here — import PROTOCOL_ERROR_CODES
// from '@midnight-ntwrk/midnight-js-protocol/errors'.

// The combined, frozen registry of every code carried by a *coded* midnight-js
// error. Not every midnight-js error carries a code, so a `false` from
// hasErrorCode does not mean the error came from somewhere else.
MIDNIGHT_JS_ERROR_CODES: readonly MidnightJsErrorCode[]

// Type guard, two forms:
// - no-arg: true only if `e` is an Error and `e.code` is a member of
//   MIDNIGHT_JS_ERROR_CODES
hasErrorCode(e: unknown): e is Error & { code: MidnightJsErrorCode }
// - with-code: true only if `e.code === code`. `code` must be one of this
//   framework's own codes, so a typo is a compile error.
hasErrorCode<C extends MidnightJsErrorCode>(e: unknown, code: C): e is Error & { code: C }

// Same comparison for a code this framework does NOT own (Node's
// ECONNREFUSED, a driver's own vocabulary). Separate name so that reaching
// outside the framework's codes is deliberate and visible at the call site.
//
// Foreignness is enforced twice. A member of MidnightJsErrorCode does not
// compile: the `code` parameter resolves to `never` for one. A code that only
// LOOKS like ours — a misspelling, which is precisely what sends a caller to
// this form — compiles, so it THROWS at runtime on the MIDNIGHT_JS_ prefix.
// Answering false there would reinstate the silent guard the constraint on
// hasErrorCode exists to abolish.
hasForeignErrorCode<C extends string>(
  e: unknown,
  code: C extends MidnightJsErrorCode ? never : C
): e is Error & { code: C }
```

### Serialized Tag Parsing

```typescript
// Parses the 'namespace:version:' prefix off the front of a serialized
// value's raw bytes. Only scans the first 64 bytes (MAX_TAG_PREFIX_BYTES) —
// throws TagParseError without reading further if no well-formed prefix is
// found there. `body` is a `.slice()` copy, independent of the input buffer.
// Both segments must be non-empty and match /^[a-z0-9_[\](),-]+$/i — the
// character set the ledger runtimes emit, e.g. 'midnight:contract-state[v8]:'.
// The tag is a defence-in-depth discriminant only; it is never the
// authority on the decoded body.
parseSerializedTag(bytes: Uint8Array): {
  namespace: string;
  version: string;
  tag: string; // `${namespace}:${version}`
  body: Uint8Array;
}
```

## Exports

```typescript
import {
  // Hex utilities
  toHex,
  fromHex,
  isHex,
  assertIsHex,
  parseHex,
  type ParsedHexString,

  // Bech32m parsing
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,

  // Assertions
  assertDefined,
  assertUndefined,
  assertNever,

  // Type utilities
  assertIsContractAddress,

  // Date utilities
  ttlOneHour,

  // Error codes and guards
  CONTRACTS_ERROR_CODES,
  type ContractsErrorCode,
  PROVIDER_ERROR_CODES,
  type ProviderErrorCode,
  UTILS_ERROR_CODES,
  type UtilsErrorCode,
  MIDNIGHT_JS_ERROR_CODES,
  type MidnightJsErrorCode,
  hasErrorCode,
  hasForeignErrorCode,

  // Serialized tag parsing
  parseSerializedTag,
  TagParseError
} from '@midnight-ntwrk/midnight-js-utils';
```

## Architecture Documents

The reasoning behind this package's shape lives in `docs/`, not in the source
docstrings. Each file is registered with TypeDoc through `projectDocuments`, so
it is a page in the generated API reference and `@see {@link Title}` in a
docstring resolves to it.

| Document | What it explains |
|---|---|
| [Error vocabulary](./docs/error-vocabulary.md) | Why the framework-code guard and the foreign-code guard are separate functions, why foreignness is enforced at both compile time and run time, and why a deserialization failure is classified rather than re-thrown |
| [Artifact runtime version](./docs/artifact-runtime-version.md) | Why only `runtime-version` is read out of a compiler description, why its absence is a refusal rather than a default, and why the integrity manifest is consulted before the description |

Docstrings in `src/` carry the API contract: what a symbol does, its
parameters, what it returns and what it throws. Anything that answers "why is
it built this way" belongs in a document above, stated once.

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
