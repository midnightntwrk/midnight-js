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

### Exhaustiveness Checking

```typescript
// Runtime backstop for a switch/if-chain over a closed union: call this in
// the default/else branch so an unhandled new union member is a compile
// error. If ever reached at runtime, throws with a message naming `context`
// and a safe rendering of `value` — primitives via String(), objects as
// `[object <ConstructorName>]` (never the object's own fields, so this is
// safe to call with values that may carry sensitive data).
assertNever(value: never, context: string): never
```

### Error Codes and Guards

```typescript
// Per-layer error-code registries (each frozen; values are string literals)
CONTRACTS_ERROR_CODES
PROVIDER_ERROR_CODES
UTILS_ERROR_CODES

// The combined, frozen registry of every code midnight-js can produce
MIDNIGHT_JS_ERROR_CODES: readonly MidnightJsErrorCode[]

// Type guard, two forms:
// - no-arg: true only if `e.code` is a member of MIDNIGHT_JS_ERROR_CODES
hasErrorCode(e: unknown): e is Error & { code: MidnightJsErrorCode }
// - with-code: true only if `e.code === code` (code need not be a member of
//   MidnightJsErrorCode, so this also compares against foreign codes)
hasErrorCode<C extends string>(e: unknown, code: C): e is Error & { code: C }
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

  // Type utilities
  assertIsContractAddress,

  // Date utilities
  ttlOneHour,

  // Exhaustiveness checking
  assertNever,

  // Error codes and guards
  CONTRACTS_ERROR_CODES,
  PROVIDER_ERROR_CODES,
  UTILS_ERROR_CODES,
  MIDNIGHT_JS_ERROR_CODES,
  hasErrorCode,

  // Serialized tag parsing
  parseSerializedTag,
  TagParseError
} from '@midnight-ntwrk/midnight-js-utils';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
