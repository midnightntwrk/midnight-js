# New Features v5.0.3

v5.0.3 is a patch release. It adds no public export. It changes how `http-client-proof-provider`
retries (#1720).

## Retry rules

| Answer from the proof server | Retried? |
|------------------------------|----------|
| 429, 500, 503 | yes, up to 3 times |
| network failure | yes, up to 3 times |
| 502, 504 | no |
| 3xx redirect | no, fails with `ProofServerError` (#1733) |
| any other status | no |
| request aborted by the timeout | no |

Wait before each retry:

| Retry | Wait |
|-------|------|
| 1 | `Retry-After` if present, else 1 s |
| 2 | `Retry-After` if present, else 2 s |
| 3 | `Retry-After` if present, else 4 s |

`Retry-After` may be seconds (`Retry-After: 5`) or an HTTP date
(`Retry-After: Tue, 24 Nov 2026 12:00:00 GMT`).

## Timeout is a strict deadline

The `timeout` option covers one HTTP request (`/check` or `/prove`), with every retry and every wait.
When it runs out, the call stops at once:

```typescript
import { httpClientProofProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider({
  url: 'https://proof.example.com',
  zkConfigProvider,
  timeout: 300_000
});
```

With this config a `/prove` call fails after at most 300 s, even if the server keeps answering 503.
Before, the waits between retries ignored the timeout.
