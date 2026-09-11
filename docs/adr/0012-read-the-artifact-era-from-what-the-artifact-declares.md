# 0012. Read an artifact's ledger era from what the artifact declares

- Status: Accepted
- Date: 2026-09-11
- Deciders: Szymon Paluchowski
- Related: #1218 (the dual-ledger dispatch this hardens), #1004

## Context

Across the ledger hard fork the contract entry points accept artifacts from two
Compact toolchains through one API, and each operation must decide which
pipeline runs. That decision was made from the shape of the caller's contract
object, in `pipelineEraOf`:

| shape | verdict |
| ----- | ------- |
| own `tag`, no `impureCircuits` | current era |
| own `impureCircuits`, `initialState.constructor.name === 'Function'` | retained era |
| own `impureCircuits`, `initialState.constructor.name === 'AsyncFunction'` | refused |
| anything else | refused |

The second and third rows are not stable facts about the artifacts. The current
toolchain emits `async initialState`; a consumer's build targeting below ES2017
— TypeScript, esbuild, older Babel presets — rewrites that into a plain
function, and `constructor.name` then reads `'Function'` on it. A current-era
contract passed raw therefore stopped being refused and was routed into the
RETAINED pipeline instead. Every other branch of that function fails closed;
this one failed open, and it failed open silently, on a consumer build setting
this framework never sees.

The era is a consensus-level fact. It was being inferred from a detail of
generated JavaScript that a build step is free to rewrite.

Two declared facts were available and unused:

- the current toolchain's `CompiledContract` container assigns itself an own
  `tag`, which survives the object spread its own combinators perform, and which
  no build step rewrites;
- `compactc` records `runtime-version` in `compiler/contract-info.json` beside
  the keys, for BOTH toolchains — including the retained one, which emits no
  integrity manifest (`contract-manifest.json` arrived in compactc 0.33).

## Decision

We will establish an artifact's era only from what the artifact declares, never
from the shape of the code the compiler generated.

- A current-era container is placed by its own `tag`. The artifact bundle is
  NOT read for it.
- A retained-era candidate is placed by the `runtime-version` its bundle
  declares, read through a new `ZKConfigProvider.getArtifactRuntimeVersion()`
  and mapped by one frozen `major.minor` table in
  `packages/contracts/src/internal/era.ts`, guarded by a compile-time gate that
  every pipeline era is reachable from some declared version.
- `constructor.name` may only REFUSE, and may never route. An `AsyncFunction`
  reading is proof of the current era that a build step can erase but never
  fabricate, so it stays as a refusal; a plain-function reading proves nothing
  and only earns the artifact the right to have its bundle consulted.
- An artifact set that declares nothing, or declares a toolchain this framework
  cannot place, is refused — `artifact-era-undeclared` and
  `unknown-artifact-runtime-version`. Neither resolves to a default, because
  every default would be a guess about which ledger executes the call.

## Consequences

- **Positive:** the fail-open closes. A transpiled current-era contract is now
  refused by the same declaration that places a real retained one. The hole the
  shape check could not close either — a `class` used as `initialState`, whose
  own constructor IS `Function` — closes with it.
- **Positive:** the current era pays nothing. It ships no new file, makes no new
  round trip, and its dispatch is unchanged.
- **Positive:** the era comes from the same bundle the proof will be built from,
  rather than from an object handed in beside it.
- **Negative:** retained-era callers must serve `compiler/contract-info.json`
  from the same location as `keys/` and `zkir/`. A bundle that ships only keys
  and ZKIR is refused on that arm.
- **Negative:** `ZKConfigProvider` grows a member. It is concrete rather than
  abstract, with a default that throws, so a provider written outside this
  framework keeps compiling and keeps working for current-era artifacts; it
  fails, loudly and by name, only if handed retained-era ones. A provider mocked
  as an object literal in a consumer's tests does have to add the member.
- **Follow-ups:** when the fork window closes and the retained arm is removed,
  `getArtifactRuntimeVersion`, the version table and the two new refusal reasons
  go with it, in one step.

## Alternatives considered

- **Keep sniffing, detect transpiled `async` better** — inspect
  `Symbol.toStringTag`, or match `__awaiter`/`regeneratorRuntime` in
  `Function.prototype.toString()`. Rejected: it chases each transpiler's output
  and stays a guess about generated code, which is the class of defect being
  removed, not an instance of it.
- **A framework-owned container for the retained era**, so the caller declares
  the era the way the current toolchain's container does. Rejected for this
  change: it works, but it puts the declaration on the CALLER rather than on the
  artifact, and it makes the retained era visibly different to use — against the
  single-API premise of #1218. Kept as the fallback if serving
  `contract-info.json` turns out to be impractical for real deployments.
- **Separate era-specific entry points** (`submitLedger8CallTx`, …), making the
  era a compile-time fact. Rejected outright: it contradicts the goal of one
  common API across this fork and the next.
- **Cross-check the current era against `contract-info.json` too.** Rejected on
  cost: it would make the file mandatory for every existing consumer, which is a
  breaking change for artifacts that are already correctly placed by a
  declaration they carry.
