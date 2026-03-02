# What is this?
An implementation of a proof provider based on the Midnight ledger proof server.

This package was created for the [Midnight network](https://midnight.network).

Please visit the [Midnight Developer Hub](https://midnight.network/developer-hub) to learn more.

# Usage

## Basic Usage

```typescript
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider
);

const provenTx = await proofProvider.proveTx(unprovenTx);
```

## Advanced URL Configuration

The provider supports complex URL configurations including path prefixes and query parameters:

```typescript
// With path prefix
const proofProvider = httpClientProofProvider(
  'http://localhost:6300/api/v1',
  zkConfigProvider
);
// Endpoints: /api/v1/check, /api/v1/prove

// With query parameters (e.g., for authentication)
const proofProvider = httpClientProofProvider(
  'http://localhost:6300?token=your-api-key',
  zkConfigProvider
);
// Endpoints: /check?token=your-api-key, /prove?token=your-api-key

// With both path and query parameters
const proofProvider = httpClientProofProvider(
  'http://localhost:6300/api/v1?token=your-api-key&env=production',
  zkConfigProvider
);
// Endpoints: /api/v1/check?token=your-api-key&env=production, /api/v1/prove?token=your-api-key&env=production
```

## Custom Timeout

```typescript
const proofProvider = httpClientProofProvider(
  'http://localhost:6300',
  zkConfigProvider,
  { timeout: 60000 } // 60 seconds
);
```

# Use only in Midnight test environments
Image exclusively for Midnight test environments use.

# Agree to Terms
By downloading and using this image, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf), which includes the [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

# License
The software provided herein is licensed under the [Apache License V2.0](http://www.apache.org/licenses/LICENSE-2.0).
