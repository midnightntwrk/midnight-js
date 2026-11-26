---
paths:
  - "packages/midnight-js/**"
---

# @midnightntwrk/midnight-js

- Barrel package re-exporting core modules (contracts, types, utils)
- Namespace exports via `index.ts` and sub-path exports for tree-shaking
- Changes to this package should only be structural (adding/removing re-exports)
- When adding a new core package, add both namespace export and sub-path export
