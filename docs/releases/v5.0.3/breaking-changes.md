# Breaking Changes v5.0.3

v5.0.3 removes and renames nothing. Two behaviour changes in `http-client-proof-provider` can change
what your code sees at runtime.

## 1. Proof server redirects are refused (#1733)

**Before:** a 3xx answer from the proof server was followed. The request body and the configured
`headers` went to the redirect target.

**After:** the request fails with `ProofServerError`. Its `status` is the 3xx code. It is not retried.

Who is affected: setups where `url` points to a URL that redirects, for example `http://`
to `https://`, or a path without a trailing slash.

```diff
  const proofProvider = httpClientProofProvider({
-   url: 'http://proof.example.com', // answered 301 → https://proof.example.com
+   url: 'https://proof.example.com',
    zkConfigProvider
  });
```

## 2. 429 is retried (#1720)

**Before:** a 429 (Too Many Requests) failed at once with `ProofServerError`.

**After:** the provider retries up to 3 times. It waits for `Retry-After`, or 1 s, 2 s, 4 s when the
header is missing or invalid. If all retries get 429, the call fails with `ProofServerError` and
status 429, as before, but later.

Who is affected: code that caught a 429 and retried on its own. That code still works, but each of
its attempts can now take longer. You can remove your own retry for 429.

In a browser, a cross-origin proof server must expose `Retry-After` through CORS
(`Access-Control-Expose-Headers`). Otherwise the provider uses the 1 s / 2 s / 4 s waits.
