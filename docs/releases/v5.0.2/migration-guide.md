# Migration Guide v5.0.1 → v5.0.2

The code does not change. Only the package names change.

## Step 1 — Replace the dependencies

Remove the old packages and add the new ones. Move every package of this repository to 5.0.2 at the
same time.

```bash
yarn remove @midnight-ntwrk/midnight-js
yarn add @midnightntwrk/midnight-js@5.0.2
```

If you use testkit-js:

```bash
yarn remove @midnight-ntwrk/testkit-js
yarn add --dev @midnightntwrk/testkit-js@5.0.2
```

If you install the packages one by one, do the same for each `@midnight-ntwrk/midnight-js-*` package.

Before:

```json
{
  "dependencies": {
    "@midnight-ntwrk/midnight-js-contracts": "^5.0.1",
    "@midnight-ntwrk/compact-runtime": "0.21.0"
  }
}
```

After:

```json
{
  "dependencies": {
    "@midnightntwrk/midnight-js-contracts": "5.0.2",
    "@midnight-ntwrk/compact-runtime": "0.21.0"
  }
}
```

`compact-runtime` keeps its name: it comes from another repository.

## Step 2 — Change the imports

Before:

```ts
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
```

After:

```ts
import { deployContract } from '@midnightntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnightntwrk/midnight-js-indexer-public-data-provider';
```

This command changes only the names of this repository's packages (macOS `sed`; on Linux use
`sed -i`). Run it from the project root:

```bash
rg -l0 -g '!*.lock' -g '!package-lock.json' '@midnight-ntwrk/(midnight-js|testkit-js)' . \
  | xargs -0 sed -i '' -E 's#@midnight-ntwrk/(midnight-js|testkit-js)#@midnightntwrk/\1#g'
```

`rg` skips files listed in `.gitignore` (so `node_modules`) and the command skips lock files. Check the diff before you
commit. The command also rewrites `Symbol.for('@midnight-ntwrk/midnight-js#…')` keys. Restore those,
because the keys did not change.

## Step 3 — Check for a second copy

A dependency that still requires `@midnight-ntwrk/midnight-js*` 5.0.1 installs a second copy of the
framework next to the new one. Check that only the new names are installed:

```bash
yarn why @midnight-ntwrk/midnight-js-types
```

The command must find nothing. If it finds a package, update that package too.

## Checklist

- [ ] Dependencies on `@midnightntwrk/*@5.0.2`
- [ ] No old name left (`rg '@midnight-ntwrk/(midnight-js|testkit-js)'`)
- [ ] `tsc` passes
- [ ] Unit and integration tests pass
