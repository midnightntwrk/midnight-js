# Persistence-envelope generations

`store/` is a LevelDB database written by
`@midnight-ntwrk/midnight-js-level-private-state-provider` and then **frozen**.
The suite that reads it (`test/cross-window.ut.test.ts`) is the only test in
this repo whose *input* bytes were not produced by the same process that reads
them. Every other private-state round trip writes and reads with one build, so a
change to the envelope — superjson's encoding, the AES framing, the PBKDF2
parameters, the salt record — moves both halves together and stays green.

## Regenerating this store is not a fix

If the consuming test fails against these bytes, **the finding is that this
checkout can no longer read private state that an earlier release wrote.** For a
dApp user that means their own encrypted state is unreadable after upgrading.

Re-minting the store makes the test pass and destroys the only evidence that
this happened. So do not treat `generators/mint-pre-fork-store.mjs` as the
remedy. Either fix the provider so the frozen bytes decode again, or — if the
break is intended — accept it explicitly:

1. Decide, and get agreement, that private state written by earlier releases may
   stop being readable.
2. Run `node src/fixtures/hf/generators/mint-pre-fork-store.mjs
   --accept-envelope-break` from `testkit-js/testkit-js/`. The flag is
   deliberate: without it the script refuses and changes nothing, so reaching
   for it out of curiosity — or because a test went red — cannot take the
   fixture with it. The script verifies it can read the state back before the
   bytes are treated as a fixture, deletes LevelDB's runtime files (`LOCK`,
   `LOG`, `LOG.old`), and prints the `- digest:` line for step 4.
3. Check `git status --short`. Expect the store's `CURRENT`, `MANIFEST-*`, one
   or more `*.ldb` and the numbered `*.log` — and nothing else. **Keep the
   numbered `NNNNNN.log`.** Despite the extension it is LevelDB's write-ahead
   log and, in a store this small, the only file holding the encrypted state; a
   store without it opens fine and finds nothing. `.gitignore`'s blanket `*.log`
   rule excluded it once already, which is why there is a negation for this
   directory, an ignore for the three runtime files, and a `.gitattributes`
   marking every file here binary. How many files there are, and what LevelDB
   numbered them, varies between runs — do not expect the set an earlier
   generation happened to commit.
4. Add a generation section immediately below this list and **above** the
   existing `## Generation N` headings — newest first — recording the digest the
   script printed and what changed. The consuming test reads the FIRST
   `- digest:` line in this file, so a section appended at the bottom leaves it
   comparing against a superseded generation and reporting that no section was
   added at all. A regeneration that skips this step fails — the note cannot
   silently fall behind the fixture.
5. Say in that section what a user with an older store has to do.

The generator is deliberately not wired into `generate-all.mjs` for the same
reason: nothing should re-mint these bytes as a side effect of regenerating
something else.

## Nothing in here is real

The state is synthetic and the password is the suite's own fixed test constant,
committed in plain sight beside it. `secretKey` is the bytes `0x00..0x1f` in
order, the nullifiers are two made-up strings, and the salt was minted for this
fixture alone. There is no key material here that means anything outside this
suite, and the store is safe to publish. Do not read it as a captured artifact
from any real wallet, and do not copy its password into anything.

## Generation 1 — 2026-09-06

- digest: f1287f56122cb46823ccaaa8a91e1754a6dd4e0ca9fd42740702f739be01e0fc
- provider: `@midnight-ntwrk/midnight-js-level-private-state-provider` 5.0.0-beta.7
- envelope: superjson, AES-256-GCM, PBKDF2-SHA256 600k iterations, 32-byte salt
  persisted in the store's own metadata record
- reason: initial freeze. No break accepted; this is the first generation, so
  there is no older store to strand.
