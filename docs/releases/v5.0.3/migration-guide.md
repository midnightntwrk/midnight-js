# Migration Guide v5.0.2 → v5.0.3

Most dApps only update the dependency. Steps 2 and 3 apply only if your setup does what they describe.

## Step 1 — Update dependencies

```bash
yarn up @midnightntwrk/midnight-js@5.0.3
```

If you depend on single packages, update all `@midnightntwrk/midnight-js-*` packages to `5.0.3`.

## Step 2 — Use the final proof server URL

Only if your proof server URL redirects. Check it:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -X POST "$PROOF_SERVER_URL/check"
```

A 3xx code means the provider now fails with `ProofServerError`. Use the URL from `redirect_url`
(without the `/check` path) as `url`.

## Step 3 — Remove your own 429 retry

Only if you wrap proof calls in your own retry for 429. The provider now retries 429 itself. Your
retry still works, but each attempt can take up to the full timeout. Remove it, or keep only the
cases the provider does not retry.

## Verify

- [ ] `yarn build` passes
- [ ] Your unit and integration tests pass
- [ ] A deploy or a call against your proof server succeeds
