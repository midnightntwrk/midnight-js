# Allowed breaking API changes

This file is the allowlist for the `.d.ts` API-report gate that protects
`@midnight-ntwrk/midnight-js-types` and the `@midnight-ntwrk/midnight-js`
barrel. The gate regenerates the API reports in
[`baselines/`](./baselines) and compares them against the checked-in
version. If they match, the gate passes. If they differ, every changed line
must match an entry in this file, or the gate fails.

The baseline files themselves are **not** regenerated on every PR — they stay
frozen while a breaking-change window is open, and entries are added here
instead to document each intentional break. When the breaking window closes,
a follow-up PR regenerates the baselines to match the new surface and clears
this file back to empty.

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

<!-- Empty: no breaking changes have been made against the current baselines yet. -->
