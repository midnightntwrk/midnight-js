# Allowed breaking API changes

This file is the allowlist for the `.d.ts` API-report gate. The gate covers
the `@midnight-ntwrk/midnight-js-types` surface; see
[Scope and limitations](#scope-and-limitations) for what it does **not**
cover. The gate regenerates the API reports in
[`baselines/`](./baselines) and compares them against the checked-in
version. If they match, the gate passes. If they differ, every changed line
must match an entry in this file, or the gate fails.

The baseline files themselves are **not** regenerated on every PR — they stay
frozen while a breaking-change window is open, and entries are added here
instead to document each intentional break. When the breaking window closes,
a follow-up PR regenerates the baselines to match the new surface and clears
this file back to empty.

## Scope and limitations

Read this before assuming a change is covered.

**What the gate really watches:** the exported type surface of
`@midnight-ntwrk/midnight-js-types`. That package's report
([`baselines/midnight-js-types.api.md`](./baselines/midnight-js-types.api.md))
lists every exported symbol and its shape, so any break there is caught.

**What the gate does not watch:** anything reached only through the
`@midnight-ntwrk/midnight-js` barrel. The barrel re-exports whole packages as
namespaces (`export * as contracts from '@midnight-ntwrk/midnight-js-contracts'`),
and [`prepare-entry.mjs`](./prepare-entry.mjs) rewrites each of those into an
import of an external namespace. API Extractor cannot see through an external
namespace import, so the barrel's report is just a handful of namespace
re-export lines. Nothing inside `contracts`, `utils` or `network-id` is
compared at all — adding, removing or breaking an export in those packages
leaves the barrel baseline byte-for-byte identical and the gate green.

So: a break in `types` fails the gate and needs an entry below. A break in any
other package does not, and this file will not record it. Do not read a green
gate as evidence that the whole public surface is unchanged.

## Format

- One entry per line, written as a markdown list item: `- <entry>`.
- An `<entry>` is either the name of a changed exported symbol (e.g.
  `createProverKey`) or a distinguishing substring of the changed report line
  (e.g. a parameter or type name).
- Matching is a plain substring check against each added or removed line in
  the diff between a baseline file and the freshly generated report. Keep
  entries specific enough that an unrelated, accidental change would not
  match them.
- Blank lines and lines that are not markdown list items are ignored, so this
  section can carry prose explaining a batch of entries.

## Entries

**Note on bare-line entries:** when a changed block contains only a single property line (e.g., `readonly version: 'v9';`) plus a closing brace, there is no exported symbol name to write an entry against. In those cases, the entry must be the distinguishing substring itself. While such an entry is listed, any future changed block in the types report containing that same line anywhere will be waved through without separate documentation — so such entries should be removed as soon as the block they cover leaves the report.

<!-- Empty: no breaking changes have been made against the current baselines yet. -->
