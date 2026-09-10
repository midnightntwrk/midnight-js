# Result-shape consistency audit — public API

> **HISTORICAL. Every defect below is written in the present tense and describes
> the tree AS AUDITED, not the tree you are reading.** Causes **R1–R4** were
> closed by the branch that tracks this file (ADR-0010, ADR-0011, ADR-0012); do
> not re-report them. **R5** (indexer documents), **R6** (error surface), **R7**
> and **R8** are still open — R7 and R8 are breaking and need a product
> decision. **B1b** (re-nesting the retained `deployTxData`) was left alone,
> also as breaking. The one live runtime defect the report found, R1's dropped
> `calls`, is fixed.
>
> Section §4's "do not re-open" list still applies. Where this report cites
> ADR-0007 to justify a handle's absence, read ADR-0011 instead — it lifted that
> bar for result types.

Audited `test/1006-ac0-contract-matrix` at `f1677a0d` (PR #1281, since merged into
`feat/1006-hardening` at `92746de0`). Read-only: no code changed.
`git diff --name-only f1677a0d..92746de0 -- packages/` is empty, so every
`file:line` below still resolves — re-run it before trusting them again.

**Organised by cause, not by symptom.** An earlier draft listed ~40 findings, one
per affected member. That count was an artifact of reporting granularity: the
same omission at the same seam appeared three and four times. Collapsed to
causes, it is **eight**, plus a tail of genuinely unrelated small items. Original
finding IDs are kept in parentheses so the working notes stay traceable.

## How this was produced, and how much to trust each line

| pass | what it did |
|---|---|
| **P1** | first audit, worked the barrels from the type definitions |
| **P2** | adversarial — given P1's findings with instructions to REFUTE, defaulting to "refuted" when a claim could not be established from source. Confirmed 8, broke 2 |
| **P3** | second audit — given the brief and only the *list of areas* P1 covered, told to find what P1 missed and to check P1's "consistent" list |

P2 and P3 did not see each other's work. Where they overlap they agree.

**Confidence.** Everything in R1–R5 and §1 was re-read by hand for this report.
R6–R8 and the tail carry P3's `file:line` evidence and were spot-checked, not
fully re-read. Items marked *(unverified)* rest on P3's reading alone.

---

## Summary

| # | cause | symptoms | base | worst case | breaking? |
|---|---|---|---|---|---|
| **R1** | one rebuild forgot a member | A1 | `main` | **runtime `TypeError` in released code** | no |
| **R2** | retained result types are hand-written mirrors; four plain-data members fell off | A3, A4, B6, C1 | HF | values unobtainable in one era | no |
| **R3** | retained entry points publish less than their pipelines compute | A2, A5, A6, B1, B2 | HF | values unobtainable; a deploy that cannot balance | no (except B1b) |
| **R4** | barrel export lists are hand-maintained and no test pins types | A7, B9.1, B9.5, B9.6 | HF | an error message names a constant nobody can import | no |
| **R5** | indexer GraphQL documents do not select fields the schema offers | A8.1, A8.2, A8.3, A8.5 | `main` | an event cannot reach its transaction | additive for consumers, breaking for implementers |
| **R6** | no single convention for `code` / `name` / `cause` across the error surface | B5, B10, B12, A8.4 | split | a retry handler needs three different branching mechanisms | one rename is |
| **R7** | absence and units encoded ad hoc, per field | B8, B9.9, B9.12, B9.13 | `main` | arithmetic across three fields of one record needs two conventions | yes |
| **R8** | named object vs positional tuple, chosen per site | B9.7, B9.14 | split | an additive field becomes a breaking change | yes |

Plus **§3**, ten individually-caused small items, and **§1**, which is why none
of this was caught.

**One gate closes R2 entirely.** Write it first.

---

## §1 Why none of this was caught

This is the highest-leverage item in the report. Fix it before any individual
defect.

```ts
// packages/contracts/src/test/typecheck/overloads.test-d.ts:243-291
expectTypeOf<Ledger8FinalizedCallTxData<…>['private']>().toHaveProperty('result');
expectTypeOf<Ledger8FinalizedCallTxData<…>['private']>().toHaveProperty('input');
…
```

Every assertion is one-directional. It confirms a named member is **present** and
can never notice one that is **absent** — which is exactly what R2 is. That is
the anti-pattern this repo's own contributor guide forbids:

> `CLAUDE.md`, Common Mistakes #3: *"One-directional test assertions —
> `expect(subset).toContain(x)` misses leaked exports. Use strict equality:
> `expect(actual.sort()).toEqual(expected.sort())`."*

A single key-set equality assertion between `Ledger8FinalizedCallTxData` and
`FinalizedCallTxData`, with an **explicit named allow-list** of the members
ADR-0007 excuses, catches all four R2 symptoms at once and keeps catching them.

The same gap one package over, and it is why R4 exists:
`packages/protocol/src/test/protocol-acl.test.ts:55-97` pins the barrel's
**runtime** key set with strict sorted equality, and nothing pins the exported
**type** set. `export-surface.test.ts` only checks that a subpath exists per
entry file.

And the ADR's own gate is short by one: ADR-0007 describes it as `structuredClone`
*"over the result of all four methods"*; `LedgerEra` has had five since
`era.ts:147`, and `era-parity.test.ts:640-643` clones four. The unguarded
method's return type **is** plain data (`ledger-v9.d.ts:276-290`), so the rule is
not violated — only unenforced, and unenforced is how the rest of this report
happened.

**Second lever, cheaper than it looks.** The framework already has one place
where this drift is impossible by construction: `FinalizedTxData` and
`FinalizedTxDataV8` both extend `FinalizedTxRecord`, so they *"differ in exactly
two places … and cannot drift apart as fields are added here"*
(`packages/types/src/midnight-types.ts:229-235`). A shared base for the members
both eras certainly carry makes R2 unrepresentable rather than merely
detectable. Propose it before building it — it reshapes types the whole stack
depends on.

---

## §2 The eight causes

### R1 — a rebuild forgot a member, and a cast hid it *(A1)*

**The only live runtime defect in this report, and it is on `main`.**

`CallResult.calls` is declared non-optional (`packages/contracts/src/call.ts:233`).
The unscoped arm carries it (`internal/transaction.ts:221`). The scoped arm
rebuilds the object member by member and omits it:

```ts
// packages/contracts/src/internal/transaction.ts:373-388   (main: :284)
return {
  public:  { nextContractState, partitionedTranscript, publicTranscript, logEvents },
  private: { input, output, privateTranscriptOutputs, result, nextPrivateState, nextZswapLocalState }
} as CallResult<C, PCK>;      // ← the assertion is what lets a missing non-optional member compile
```

**Path established, not inferred.** `submit-call-tx.ts:200` → `Transaction.scoped(…, transactionContext)`
→ `outerTxCtx = txCtx` → `runScope`. At `:363` the guard `if (!outerTxCtx)` is
false, so `[Submit]()` — the only site that sets `calls` — is skipped.

**Reachable below?** `unprovenCallTxData.calls` is populated at
`unproven-call-tx.ts:181` and is in scope at the `return`.

**Caller impact.** `result.calls[0]` throws
`TypeError: Cannot read properties of undefined`, at a member the compiler just
declared non-optional and `readonly`. For a cross-contract circuit this is the
only route to callee call data.

**Justification search.** None. `docs/adr/`, all three `docs/` trees, the
`CallResult.calls` docblock (`call.ts:224-232`, which *promises* the member), and
the construction site's comments (`internal/transaction.ts:366-367`, which
explains only *which call* is reported). The tests asserting `calls`
(`submit-call-tx.test.ts:126, 245, 479`) all sit on the `[Submit]()` path.

**Fix.** Add `calls: unprovenCallTxData.calls`, delete the cast. Non-breaking.
Ship alone, first.

---

### R2 — the retained result types are hand-written mirrors, and four plain-data members fell off *(A3, A4, B6, C1)*

`Ledger8CallResultPrivate` / `Ledger8CallResultPublic` were written by hand
against their current-era counterparts. Four members did not make the copy. The
docblock asserts the copy is complete:

> `ledger8-contract.ts:262` — *"Mirrors `CallResultPrivate` **plus** `txBytes`"*
> `ledger8-contract.ts:249` — *"Mirrors `CallResultPublic` **except for** `nextContractState`"*
> `ledger8-contract.ts:296-300` — *"The members that differ are **the two** the current era expresses as live WASM handles."*

All three are wrong. The count is four, not two, and one docblock claims a
superset where there is a subset.

| member | status | evidence |
|---|---|---|
| `nextZswapLocalState` *(A3)* | **missing, should be carried** | plain `interface` in *both* runtimes — `compact-runtime-ledger8/dist/zswap.d.ts:7`, `@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:23` — and its members are plain too (`onchain-runtime-v3.d.ts:67` `CoinPublicKey = string`, `:156`, `:176`). ADR-0007 does not reach it |
| `newCoins` *(A4)* | **missing, should be carried** | `ShieldedCoinInfo` is a plain `type` (`ledger-v9.d.ts:163`). `zswapStateToNewCoins` (`utils/zswap-utils.ts:182-185`) is pure array filtering — era-independent by construction |
| `calls` *(B6)* | **missing** | every member of a `ContractCall` except `public.contractState` is already at the boundary. Cross-contract calls are ledger-9-only, so a retained `calls` is always a single entry |
| `logEvents` *(C1)* | **absence is CORRECT** | `grep -rl LogEvent node_modules/compact-runtime-ledger8/dist/` returns nothing; `onchain-runtime-v3` has zero occurrences. The retained toolchain has no log-event concept at any layer. **Only the docblock is wrong** |

**The counter-argument that looks right and isn't.** `overload-typing.md:132-136`
*does* invoke ADR-0007 over a Zswap local state — but that is
`Ledger8CircuitContext.currentZswapLocalState`, the runtime's **byte-encoded**
form. The transcript's is the **decoded** public shape
(`protocol/src/lib/v8/execute.ts:17, 169`). Different value, different rule.

**Reachable below?** Yes, all three. `zswapLocalState` is picked into
`Ledger8Transcript` at `internal/ledger8-pipeline.ts:86` and read at `:492`,
`:499`, `:525`; `Ledger8CallPipelineResult` (`:384-429`) never copies it, and the
construction site (`internal/ledger8-entry.ts:977-992`) builds `private` from
`call.*` only. `newCoins` needs one call with two arguments the pipeline already
holds.

**Caller impact.** Unobtainable after submission — the transaction is already
composed, and re-running the circuit to recover the values would compose a
second one.

**Fix.** Carry three members through `Ledger8CallPipelineResult`; correct three
docblocks. Additive. **The §1 gate makes all four RED at once** — write it first
and this section becomes mechanical.

---

### R3 — the retained entry points publish less than their pipelines compute *(A2, A5, A6, B1, B2)*

The boundary types for the retained era were written before the machinery under
them was finished, and never caught up. Four surfaces, one pattern.

**A2 — the async submit drops the whole execution result.**

```ts
// tx-model.ts:268 — current
{ txId; callTxData: UnsubmittedCallTxData }   // public + private + calls + unprovenTx + newCoins
// ledger8-contract.ts:312 — retained
{ txId; circuitId; nextPrivateState }
```

The internal helper already returns everything and says the public surface will
not carry it:

```ts
// internal/ledger8-entry.ts:904-910
/** The pipeline's own result … Internal: the PUBLIC async surface stays
 *  {@link Ledger8SubmittedCallTx}, which does not wait for finalization and so
 *  has no record to pair this with. */
readonly call: Ledger8CallPipelineResult;
```

That reason explains why the arm cannot answer with a *finalized record*. It does
not survive as a reason for dropping the *execution data*, because the current
era's `callTxData` is exactly execution data without a record. Grepped all three
doc trees for `Ledger8SubmittedCallTx` / `submitCallTxAsync` — zero hits.

**A5 — the deploy discards the constructor's Zswap local state.** The retained
artifact returns three members, confirmed against real generated code:

```js
// packages/contracts/src/test/resources/compiled/shielded-map/contract/index.js:249-253
return { currentContractState: state_0,
         currentPrivateState:  context.callContext.currentPrivateState,
         currentZswapLocalState: context.callContext.currentZswapLocalState }
```

`executeConstructor` reads two (`protocol/src/lib/v8/deploy.ts:82-85, 107-110`).
So `runLedger8DeployPipeline` never sets `guaranteedZswapOffer`
(`internal/ledger8-pipeline.ts:650-671`) although
`ComposeV8DeployOptions.guaranteedZswapOffer` exists for it
(`deploy.ts:132-133`). The current era does the opposite
(`utils/ledger-utils.ts:83`). **A retained constructor that mints a coin would
compose a transaction the ledger cannot balance.** Not observable today —
`deployContract`'s retained arm refuses — but `keep-state-pipeline.md:337-408`
lists three things needed to lift that refusal and this is a fourth nobody wrote
down.

**A6 — the deploy has no substitute for `initialContractState`.**
`Ledger8DeployPipelineResult.initialState: Uint8Array`
(`internal/ledger8-pipeline.ts:621-631`) is precisely the ADR-0007-compliant
plain-data substitute, computed at `deploy.ts:226` and dropped at the boundary,
along with `nextPrivateState`. Unobtainable: the deploy mints a fresh nonce.

**B1 — `findDeployedContract`'s retained arm answers with a structurally
unrelated object.**

```ts
// find-deployed-contract.ts:214 — current
{ deployTxData: FinalizedDeployTxDataBase<C>; callTx; circuitMaintenanceTx; contractMaintenanceTx }
// ledger8-contract.ts:355 — retained
{ compiledContract; contractAddress; deployTxData: VersionedFinalizedTxData }
```

The version-tagged record **is** justified (`keep-state-pipeline.md:312-315`) and
the discarded signing key is recorded at the option that is discarded
(`ledger8-contract.ts:332-349`). Nothing records the absent `callTx` and
maintenance interfaces, or the lost `public`/`private` nesting. Nothing
era-specific blocks a `callTx`: the retained call path exists and the circuit-id
list is already materialised at `find-deployed-contract.ts:317`.
**B1a (add `callTx`) is additive; B1b (re-nest `deployTxData`) is breaking.**

**B2 — `Ledger8DeployContractOptions` cannot express constructor arguments.**
Missing `args`, `privateStateId`, `initialPrivateState`,
`additionalCoinEncPublicKeyMappings`. The mappings **are** justified
(`keep-state-pipeline.md:182-197`) and `initialPrivateState` is acknowledged
(`:409-427`); `args` is not — and the retained era contradicts itself, since
`Ledger8CallTxOptionsBase` (`:194-202`) carries a conditional `args` explicitly
*"mirroring the current era's `CallOptionsWithArguments`"*, while
`Ledger8Contract.initialState(...args: never[])` declares that a retained
constructor takes arguments. Reachable below in the input direction:
`Ledger8DeployRequest.args` (`ledger8-entry.ts:612`), exercised by
`v8-native.test.ts:875-925`. As published, a retained deploy can only ever deploy
a zero-argument constructor.

**Fix.** All additive except B1b. Say explicitly in the PR body that the deploy
half is not observable end to end today.

---

### R4 — barrel export lists are hand-maintained, and no test pins types *(A7, B9.1, B9.5, B9.6)*

Four omissions, all invisible to both existing gates (see §1).

**A7 — `INITIAL_LEDGER_PARAMETERS` is exported from no entry point, and an error
message tells callers to use it by name.**

```
packages/contracts/src/errors.ts:292 — on LedgerParametersUnservedError:
  "…it has to be selected by name — see `INITIAL_LEDGER_PARAMETERS` in `midnight-js-protocol`."
```

It cannot be. `lib/era/load-era.ts:28-37` re-exports six of the ten names in
`lib/shared/compose-types.ts`; the four omitted are `INITIAL_LEDGER_PARAMETERS`,
`LedgerParametersOption`, `PartitionedCallTranscript` and
`EraPartitionCallOptions` — the value, parameter type, return type and option
vocabulary of `LedgerEra.partitionCallTranscript`, the facade's fifth method.
Absent from `protocol/src/index.ts` and from the `midnight-js` barrel.

The constant's own docblock (`compose-types.ts:74-84`) says it exists so the
compatibility path is *"reachable only as a decision, never as an oversight"* —
and the only way to reach it today is to hand-write `'initial'`. Supporting
evidence that this is an omission: `protocol-acl.test.ts:50-54` enumerates the
barrel's value sources as *"./errors, ./version and lib/v8/load"*, omitting
`lib/era/load-era`.

*Severity, precisely:* weaker than R1–R3. The literal `'initial'` still
type-checks, so no **value** is unobtainable — what is unreachable is the
**named** form, and with it the guarantee the constant exists to give.

**B9.1 — the `Ledger8Engine` type set is split across two entry points, and
neither has all of it.** The root barrel (`lib/v8/load-engine.ts:21-28`) omits
`ExecuteConstructorOptions` and `ConstructorResultPojo`; the `./engine` subpath
(`dist/engine.d.ts:322`) omits `ContractEntryPointPojo`, which it declares at
`:17`. No single import reaches all of `executeConstructor`'s vocabulary.

**B9.5 — `ProtocolErrorCode` excluded on a rationale the types contradict.**
`barrel-published-surface.md` publishes a type named by *"a public field of an
exported error class"* and argues `ProtocolErrorCode` does not qualify because
`UnknownProtocolVersionError.code` is the two-member literal. True of that class;
**false** of `ComposeFailedError`, `ComposeOptionError` and
`StateDecodeFailedError` (`protocol/src/errors.ts:401, 565, 630`), all three
published, all three naming the wide alias. Second-order and
barrel-independent: `switch (e.code)` narrows on nine classes and not on those
three.

**B9.6 — `NO_CIRCUIT` is not on the barrel that publishes its class.** Its
docblock says it exists *"so a consumer reading `circuitId` off a caught error
can compare against it instead of matching a string"* — and the barrel consumer
cannot.

**Fix.** All additive: add the names, and either narrow the three widened `code`
fields (which also makes the document's premise true) or publish the alias.
Land the §1 type-export pin in the same PR.

---

### R5 — the indexer's GraphQL documents do not select fields the schema offers *(A8.1, A8.2, A8.3, A8.5)* *(unverified beyond spot-checks)*

Four gaps on `PublicDataProvider`, all with the value present one layer down.

| symptom | evidence | below the boundary |
|---|---|---|
| **A8.1** a `ContractEvent` cannot reach its transaction. `ContractEventBase.transactionId` (`types/src/public-data-provider.ts:174`) and `FinalizedTxRecord.indexerId` (`types/src/midnight-types.ts:272`) are the **same integer** under two names, and no method accepts either. The docblock says *"issue a separate query"* — no such query exists | `mapping.ts:122`, `events-mapping.ts:42`, `gen/schema-types.ts:238, 953` | `ContractEvent.transaction` is a schema field (`gen/schema-types.ts:237`) the two documents do not select (`query-definitions.ts:428-476`) |
| **A8.2** `queryBlock → BlockInfo { hash, height }` drops `protocolVersion`, `timestamp`, `author`. The interface docblock at `:502-503` claims *"the `protocolVersion` that every read on this interface already carries"* — untrue of `queryBlock`. Learning a specified block's era takes two requests that can straddle the fork, and the second returns the *head's* era | `public-data-provider.ts:75-84` | `gen/schema-types.ts:70, 74, 44`; two sibling documents already select it |
| **A8.3** `watchForTxData(txId)` returns a record carrying `txHash` and will not accept one back, while `ContractEventFilterBase.transactionHash` does address events by chain hash | `:409` vs `:262` | `TransactionOffset` is `{hash} \| {identifier}` (`gen/schema-types.ts:1407-1412`); `provider.ts:442` hardcodes one arm |
| **A8.5** exactly one era-agnostic state read exists. `queryDeployContractState`, `watchForContractState`, `contractStateObservable` and the triple all decode to a v9 handle and throw for retained bytes | `codec.ts:100, 404-406` | three call sites hold `{hexState, protocolVersion}` immediately before decoding — exactly `toRawContractState`'s input (`codec.ts:425`) |

A8.5 is partly covered by `versioned.ts:96-98`, which says contract-state reads
are v9-only without saying why the escape hatch covers one path of four. The
others: no justification found.

**Fix.** Select the fields; add `watchForRawContractState` /
`rawContractStateObservable`. Additive for consumers, **breaking for third-party
`PublicDataProvider` implementers** — and nobody in this repo knows how many
exist.

---

### R6 — the error surface has no single convention for `code`, `name` or `cause` *(B5, B10, B12, A8.4)* *(unverified beyond spot-checks)*

| package | coded | uncoded |
|---|---|---|
| `contracts` | 13 | **16** |
| `types` | 2 | **7** |
| `utils` | 1 | **3** |

The retained-era cohort, added in one body of work, splits down the middle:
`Ledger8DeployOnV9Error`, `Ledger8ShieldedSpendUnsupportedError` and
`Ledger8SeamFailedError` carry a code; `Ledger8DeployUnmaintainableError`
(`errors.ts:934`), `Ledger8CallTxFailedError` (`:969`),
`Ledger8AmbiguousEntryPointError` (`:1001`) and `Ledger8RecipientUnmappableError`
(`:1035`) do not, and `CONTRACTS_ERROR_CODES` has no constant for any of them.

Four more splits in the same surface:

- `InvalidProtocolSchemeError` (`types/src/errors.ts:183-193`) sets **neither
  `code` nor `this.name`** — it reports as `'Error'`, thrown from a public
  factory (`fetch-zk-config-provider.ts:65`).
- `.cause` means two things: a chained `Error` on three classes, and a **string
  literal union** on `PrivateStateImportError` and its three subclasses
  (`types/src/errors.ts:219-235`). `ExportDecryptionError`'s constructor takes no
  arguments (`:244-250`), so the original error is unconditionally discarded —
  against this repo's own rule #4.
- `utils` exports four error classes expressing failure four ways *(B10)*:
  `TagParseError` has a code and no discriminant; `PasswordValidationError` a
  `reason` and no code; `ZkArtifactIntegrityError` **neither**, with ten throw
  sites (`zk-artifact-manifest.ts:103…219`) distinguishable only by message text
  — on the package whose job is integrity; `DeserializationError` a
  `context.classification`.
- `ZKConfigRegistry.asKeyMaterialProvider` *(B12)* turns a documented-normal
  `undefined` — *"a `midnight/` protocol builtin, which provers resolve
  elsewhere"* (`zk-config-registry.ts:110-112`) — into an anonymous
  `throw new Error(...)` with no code, no `name`, no `@throws` (`:128-134`).
- The two shipped `ZKConfigProvider`s express "artifact absent" incompatibly
  *(A8.4)*: Node throws a `SystemError` with `code: 'ENOENT'`
  (`node-zk-config-provider.ts:68`), Fetch a bare `Error`
  (`fetch-zk-config-provider.ts:91-98`). The *consequence* is recorded —
  `zk-config-registry.ts:153-156`: *"The provider interface can't tell them
  apart"* — the cause is not. A genuine `EACCES` or a 500 surfaces as
  `ZKArtifactNotFoundError` ("artifacts missing or stale").

**Recorded justification.** Generic and self-contradicting:
`utils/src/error-codes.ts:63-66` records *that* not every error carries a code,
names no class and gives no reason, while `:59-60` states the policy — *"Add a
constant here in the same change that first throws with it"* — that the uncoded
classes do not follow.

**Also here:** the surviving half of the withdrawn D2 — `Ledger8CallTxFailedError`
exposes the record as `txData` where `TxFailedError` calls it `finalizedTxData`
(`errors.ts:667` vs `:971`). The separate *class* is justified; the rename is not.

**Caller impact.** The barrel documents `hasErrorCode` as the branching
mechanism. A retry handler needs `hasErrorCode` for three retained-era errors,
`instanceof` for four, and message-matching for the bare ones.

**Fix.** Codes for the uncoded classes, `this.name` on
`InvalidProtocolSchemeError`, a `reason` on `ZkArtifactIntegrityError`, one
shared `ZKArtifactMissingError` in `types` — all additive. Renaming
`PrivateStateImportError.cause` → `reason` is the one breaking piece.

---

### R7 — absence and units are encoded ad hoc, per field *(B8, B9.9, B9.12, B9.13)* *(unverified beyond spot-checks)*

The pattern: a field passed straight through from the wire keeps the wire's
convention; a field manufactured by the mapper gets whatever its author chose.
An artifact of who built the field, not a decision.

**B8 — token amounts under three names and two types.** Six wire values, all
decimal strings up to 16 bytes (`gen/schema-types.ts:179-180`):

```
midnight-types.ts:187   UnshieldedUtxo.value:      bigint   ← codec.ts:487 BigInt(...)
midnight-types.ts:326   UnshieldedBalance.balance: bigint   ← codec.ts:496 BigInt(...)
midnight-types.ts:216   Fees.paidFees:             string   ← mapping.ts:126 pass-through
midnight-types.ts:220   Fees.estimatedFees:        string   ← mapping.ts:125 pass-through
public-data-provider.ts:211,218,224,230  ContractEvent amount: string
```

`FinalizedTxRecord` carries both conventions at once. `balances[i].balance +
BigInt(events[j].amount) - BigInt(txData.fees.paidFees)`: two of three terms must
be converted, the third must not; uniform conversion throws. Justification is
one-sided — `public-data-provider.ts:187-188` justifies not using `number`, not
the choice against `bigint` the same package makes two files away. Nothing for
`Fees`.

**B9.9 — two absence encodings on one interface.**
`FinalizedTxRecord.blockAuthor: string | null` (`:268`, wire pass-through) sits
beside `segmentStatusMap: … | undefined` (`:285`, manufactured at
`codec.ts:462-469`), neither optional-marked — while the same provider's
`ContractEvent` states the opposite rule: *"Absent nullable fields are normalized
to `undefined` (never `null`)"* (`public-data-provider.ts:188-189`). Across
`packages/types` there are four encodings of absence: `null`, `undefined`, `?:`,
and a throw.

**B9.12 — `raw` is bytes on one read and hex on another.**
`RawContractState.raw: Uint8Array` (`raw-contract-state.ts:60`) vs
`ContractEvent.raw: string` (`public-data-provider.ts:180`), both described as
the opaque verbatim payload for that era's decoder. The hex form invites the
truncation bug `codec.ts:68-78` documents — *"stops at the first character it
cannot read and returns a SHORTER buffer without complaining"* — and `parseHex`
is not re-exported.

**B9.13 — contract addresses branded on one event field, bare on two.**
`ContractEventBase.contractAddress: ContractAddress` (`:167`) vs
`ContractEventAddress.value: string` (`:134`) and `receivingContractAddress?:
string` (`:197`). The mapper casts for one and not the others
(`events-mapping.ts:41` vs `:74, 77, 101`) — though `ContractEventAddress` exists
precisely *"so consumers can tell a user address from a contract address rather
than receiving a bare, ambiguous string"*.

**Fix.** Mostly breaking. Belongs in one batch, in a major.

---

### R8 — named object vs positional tuple, chosen per site *(B9.7, B9.14)* *(unverified beyond spot-checks)*

**B9.7** — `queryZSwapAndContractState` returns
`[ZswapChainState, ContractState, LedgerParameters] | null`
(`public-data-provider.ts:336-339`) where seven siblings return named objects. It
cannot express partial absence (`provider.ts:296` nulls if any of three is
missing), and it is why R5's A8.2 fix would be a breaking positional change
rather than an additive field. The *coupling* is well justified
(`provider.ts:270-278`); the *tuple* is not.

**B9.14** — `partitionCallTranscript` returns a positional tuple
(`compose-types.ts:111-114`) consumed as a named object with optional members
(`:73-77`) by the operation it exists to precede, across one documented hand-off
(`era.ts:135-147`). The framework's own consumer pays the conversion verbatim at
`internal/ledger8-pipeline.ts:569-573`, and it type-checks only because
`exactOptionalPropertyTypes` is unset.

**Fix.** Named objects. Breaking in both cases; B9.7 is the prerequisite for
making A8.2 additive.

---

## §3 The tail — individually caused, mostly one line each

*(unverified beyond spot-checks)*

| # | what | fix | breaking |
|---|---|---|---|
| B3 | `submitReplaceAuthorityTx` returns a **function** where its two siblings return the record (`governance/submit-replace-authority-tx.ts:64-100` vs `submit-insert-vk-tx.ts:69-74`). All three exported side by side as one family; `submitReplaceAuthorityTx(p, c, a)` silently succeeds doing nothing. The curried form serves one internal binder a lambda would serve | un-curry, adapt the binder | yes |
| B4 | `ContractConstructorResult` (`call-constructor.ts:86`) is exported and **produced by nothing** — three source hits: declaration, barrel, one test mock. Meanwhile the same `zswapLocalState` is published as `initialZswapState` (`unproven-deploy-tx.ts:154`) and `nextZswapLocalState` (`unproven-call-tx.ts:162`). *(The third naming, `current*` on `Ledger8ConstructorResult`, is genuinely the vendor artifact's vocabulary — `compact-runtime-ledger8/dist/constructor-context.d.ts:26-30` — but that is **not recorded anywhere in this repo**)* | stop exporting it, or make the deploy path return it | yes if removed |
| B7 | `submitCallTxAsync` loses the compile-time private-state check `submitCallTx` enforces: one arm takes the union on both sides (`submit-call-tx.ts:305-308`), so a `privateStateId` without a private-state provider compiles and fails at runtime (`:337-339`) | split into the same two arms | only for code relying on the looser typing |
| B11 | private-state bulk operations answer "how many records moved" in **four** shapes, cap the batch under **three** names (`maxStates`/`maxKeys`/`maxEntries`), and express "nothing to do" two opposite ways — export **throws** (`level-private-state-provider.ts:875, 1041`), rotation **returns zero** (`:446-448`). Over-limit throws three classes, one a bare `Error` (`:411-414`) | unify the over-limit class (additive); unify empty-store behaviour | the latter |
| B9.10 | `LogLevel` has six members including `TRACE`; `LoggerProvider` (`types/src/logger-provider.ts:39-46`) has five and **no `trace`**; the shipped class has six, all required, and no `implements`. Everything the framework logs at trace is unreachable through the interface | add `trace?: LogFn` | no |
| B9.8 | Node ZK provider returns `Buffer`, Fetch returns `Uint8Array`, for the same branded types. `JSON.stringify`, `String()`, `instanceof` all differ, with no compile-time signal | `new Uint8Array(await fs.readFile(...))` | no |
| B9.11 | `unshieldedBalancesObservable` throws **synchronously** for one arm of its declared config type (`provider.ts:551-555`) — so `catchError` cannot catch it, unlike every other stream failure this interface documents. Recorded on the implementation, not on the interface third parties implement | narrow the parameter, or move the paragraph | no |
| B9.2 | `extractState` and `decodeContractState` put the runtime diagnosis at `cause` on one and `cause.cause` on the other; the interface docblock (`era.ts:57-59`) asserts parity that does not hold. The extra layer is recorded (`fail-closed-decoding.md:104-113`); the divergence is not | correct the docblock | no |
| B9.3 | `reexpressOperationsForCurrentEra` produces `Uint8Array` (`v9/operations.ts:50, 72`); `wrapKeepStateCall` consumes a live `ContractState` (`v9/wrap.ts:33`). Chaining them is a serialize immediately followed by a deserialize inside one module. Not paid today — `ledger8-pipeline.ts:549` routes elsewhere | accept bytes, or record the split | yes if changed |
| B9.4 | `TagParseError` merges *malformed bytes* with *well-formed envelope from an unsupported runtime* under one code, where the integer path carries `reason: 'unknown' \| 'malformed'`. The distinction is decided at `contract-state-envelope.ts:66-67` and discarded at the throw. The recorded omission of the attacker-controlled **tag text** does not reach a `reason` literal | add `reason` | no |
| — | `ProveTxConfig.timeout` honoured by the HTTP provider on both arms (`http-client-proof-provider.ts:131-144`), dropped by the DApp-connector one on both (`:74, 76`) — its v9 arm forwards to `createProofProvider`, which does not declare the parameter (`types/src/proof-provider.ts:106`). Eleven lines above the drop site the same file records the opposite discipline for `costModel`: *"an override is not offered at all rather than offered and quietly ignored"* | forward it, or state who honours it | no |
| — | smaller: `fromHex` is the only byte-producing helper returning `Buffer`; `assertIsHex` narrows `string` to `NonNullable<string>` — the same type — where its sibling narrows to a brand; `isValidSigningKey` is the only `unknown`-taking predicate in `utils` that does not narrow, though `SigningKey` is reachable and it checks exactly that shape; `utils` exports two functions returning `LedgerVersion` and does not export `LedgerVersion` | — | mixed |

---

## §4 Explained — do not re-open

Differences that are correct and recorded. Changing them undoes a decision.

- **`Ledger8CallResultPublic` has no `nextContractState`** — ADR-0007; the
  post-state is an `onchain-runtime-v3` handle and the same bytes are already
  available from `extractState` (`ledger8-contract.ts:246-253`).
- **`Ledger8CallResultPrivate` has `txBytes` in place of `unprovenTx`** —
  ADR-0007's named plain-data substitute.
- **Retained records are `VersionedFinalizedTxData`, not narrowed** —
  `ledger8-contract.ts:280-288`, `keep-state-pipeline.md:312-315`.
- **`Ledger8CallTxOptions` has no `additionalCoinEncPublicKeyMappings`** —
  `keep-state-pipeline.md:182-197`: *"A refusal is the correct answer until then,
  and is the one answer that cannot lose a recipient's coin."*
- **`Ledger8FindDeployedContractOptions` has no private-state members** —
  `keep-state-pipeline.md:409-427`, `ledger8-entry.ts:826-832`.
- **`deployContract`'s retained arm always throws** — measured,
  `keep-state-pipeline.md:337-406`, pinned by `v8-deploy.test.ts`. *(But
  `submitDeployTx` has no retained arm at all and governance has none either —
  the same operation is a coded error at one layer and a compile error at
  another, and that split is **not** recorded. Documentation fix.)*
- **Contract-state reads stay v9-only** — `types/src/versioned.ts:96-98`. *(Does
  not cover why the escape hatch reaches one path of four — see R5/A8.5.)*
- **"Contract state" is typed three ways** (`StateValue` on a call's output,
  `ContractState` on a deploy's and on a call's input) — **origin is upstream**;
  compact-js's own `ContractCallPublic.contractState` and
  `DeployResultPublic.contractState` differ. Not this framework's shape to fix.
- **`ConstructorResultPojo.contractState` is a live pre-fork handle** — ADR-0007
  names it explicitly; `.serialize()` is the substitute.
- **`ContractEventBase.version: number`** against `version: 'v8'|'v9'` elsewhere —
  recorded at `public-data-provider.ts:156-165`. Noted only because the name is
  now taken, so an era discriminant cannot be added without a breaking rename.
- **`TranscriptPojo` carries no gas figure** — `retained-era-execution.md:251`.
- **`ContractStatePojo` omits `maintenanceAuthority`/`balance`; `entryPoints` is
  an array** — `fail-closed-decoding.md:214-222`.
- **`queryLatestProtocolVersion` throws; `queryContractEvents` returns `[]`** —
  both recorded on the members.
- **`ComposeCallOptions.networkId` is `string`** — layering forces it;
  `NetworkId = string`.
- **`protocolVersionToLedger` excluded from the barrel** —
  `barrel-published-surface.md`. *(Its sibling exclusion is not sound — R4/B9.5.)*
- **The two envelope readers, and `toRawContractState`** — perfectly symmetric.
  The models the rest should be measured against.
- **`ZKConfigProvider` documents no absence behaviour** — alone among the read
  providers. Documentation fix; the implementation-level consequence is R6/A8.4.

---

## §5 Withdrawn after adversarial review

Kept so the same ground is not re-covered.

**D1 — `withContractScopedTransaction` returns the last call's data.**
*Downgraded to a known ergonomics wart.* The docblock does not say what the first
pass claimed: the phrase is at `transaction.ts:110-111` and *"all circuit calls"*
modifies **the single transaction**, not the execution data. The behaviour is
pinned by a test (`submit-call-tx.test.ts:201-252` runs two calls and asserts the
result equals the **last**), the accessor is named
`getLastUnsubmittedCallTxDataToTransact`, and `internal/transaction.ts:366-367`
says so. Decided, not overlooked. A `callResults: readonly CallResult[]` member
would still be an improvement — additive.

**D2 — `Ledger8CallTxFailedError` leaves the shared base.** *Half withdrawn.*
`finalizedTxData: FinalizedTxData` is declared on **`TxFailedError` itself**
(`errors.ts:667`), so the docblock's *"cannot be reused because it carries a
current-era `FinalizedTxData`"* (`:953-955`) **is** a recorded reason for not
sitting under that base. What survives is the member rename, folded into R6.

---

## §6 One premise in the audit brief is false

`docs/qa/public-api-result-shape-audit-prompt.md:117` instructs auditors to
excuse gaps because *"`packages/types` is declarations-only. Runtime helpers live
in `packages/utils`."*

It is not. Verified by hand: `packages/types/src` exports ~29 runtime values —
`makeContractExecutableRuntime`, `exitResultOrError`, `asEffectOption`,
`asContractAddress` (`contract.ts:92-137`); `createProofProvider`,
`createWalletProvider`, `createMidnightProvider`; `createProverKey` /
`createVerifierKey` / `createZKIR`, `zkConfigToProvingKeyMaterial`; `unwrapV9`;
`MAX_EXPORT_STATES`, `MAX_EXPORT_SIGNING_KEYS`; the five status/segment
constants; `LogLevel` (an `enum`, so a runtime object); nine error classes;
`ZKConfigRegistry`; and a re-export of the `Transaction` class (`index.ts:32`).
The only place the claim is written down is `raw-contract-state.ts:31`, scoped to
that one file.

The rule is a real project convention, so the gap between rule and code needs a
decision of its own: correct the brief, or move the values. Meanwhile, any
finding waved off on that basis should be re-examined — and note that adding a
declarations-only **error class** to `types` is consistent with what is already
there, which is what R6's fixes want to do.

---

## §7 Entry points verified consistent

Checked twice, independently. Two claims did not survive the second check.

| claim | verdict | what settles it |
|---|---|---|
| `submitCallTx`'s four current-era arms | agree | `submit-call-tx.ts:78-89`, `:95-108`; the narrower scoped shape is recorded on the arms |
| `submitDeployTx`'s two current-era arms | agree | `submit-deploy-tx.ts:38-46` |
| `deployContract`'s two arms; `DeployedContract` vs `FoundContract` | agree | `deploy-contract.ts:153-164`; `:92-100` overrides exactly one inherited member, with the reason on it |
| `findDeployedContract`'s three current-era arms | agree | `find-deployed-contract.ts:264-283` |
| `submitTx` vs `submitTxAsync` | agree | both delegate to one `submitTxCore` (`submit-tx.ts:82-101`); `TransactionId = string` |
| `createUnprovenCallTx` / `…FromInitialStates` | agree | `unproven-call-tx.ts:54-66`, `:341-351` |
| `createUnprovenDeployTx` / `…FromVerifierKeys` | agree | `unproven-deploy-tx.ts:83-95`, `:176-184`. Aside: `@param verifierKeys` at `:101` names a parameter that does not exist |
| the three governance submits + two maintenance interfaces all resolving `FinalizedTxData` | **disagree** | `submitReplaceAuthorityTx` returns a **function** — §3/B3. The other four hold |
| `getStates` vs `getPublicStates` | agree | `get-states.ts:43-48`; a strict superset |
| `proveTx` / `balanceTx` / `submitTx` trading `VersionedTx` and documenting the same refusals | **disagree, narrowly** | the `VersionedTx` half holds. `proveTx` documents **three** refusals (`proof-provider.ts:73, 78, 83`), the other two document **two**, while `V8TxBytes` is unvalidated on all three seams (`versioned.ts:31-35`). Fix: two `@throws` lines |
| `PublicDataProvider` internally uniform | agree on the rule, not that it settles it | the rule holds exactly, and query/stream element parity was verified at the implementation. Three members sit outside it — two explained, one not (§3/B9.11); and the v9-only list omits `queryDeployContractState` (R5/A8.5) |
| `PrivateStateProvider.get`/`getSigningKey`; the four export/import **result** shapes | agree | `:280`/`:342` identical absence encoding and throw lists; result types field-for-field identical, counters computed identically. The **options** diverge — §3/B11 |
| `FinalizedTxData` vs `FinalizedTxDataV8` | agree | `midnight-types.ts:236`, `versioned.ts:100`, four compile-time assertions at `:132-144`. `FinalizedTxDataV8.tx` is built *by* the v8 runtime (`codec.ts:162-168`), so it crosses no era boundary. **The pattern to measure the rest against** |

Also verified and consistent: both `indexerPublicDataProvider` overload arms reach
one concrete type through one path · `getAllContractEvents` · the four exported
hex parsers all throw, none returns `null` · `toRawContractState`'s single
construction point · both proof providers answering a v8 request in the v8 arm ·
`ZKConfigRegistry.get` throwing where `resolveKeyLocation` returns `undefined`
(but see R6/B12 for the third accessor) · `PasswordRotationResult` used
identically by both rotation methods.

---

## §8 Not audited, and why

1. **Runtime behaviour.** Everything here is read from type definitions,
   construction sites and checked-in `dist/*.d.ts` export clauses, as the brief
   directs. R1's predicted `undefined`, R3's balancing consequence and B9.8's
   `Buffer` divergence were not confirmed by execution.
2. **`packages/compact` has no library surface** — no `exports`, `main`, `types`
   or `src/index.ts`, only `bin`. Nothing importable. Not a clean bill of health
   for its code.
3. **Protocol's ten vendor pass-through subpaths** — each exactly one
   `export * from '<vendor>'`, verified. Structure symmetric; vendor member
   shapes are upstream.
4. **`ledger-v8` vs `ledger-v9` member parity** — a vendor-API audit. The
   framework's *own* two arms were compared and match, with the same refusal
   order and error stages.
5. **Provider implementation bodies** were read only where a finding required it.
   A systematic conformance pass — does each implementation match the interface
   it declares? — is a different question and worth its own run.
6. **`testkit-js` / `testkit-js-e2e`** — out of scope by the brief.
   `InMemoryPrivateStateProvider` is the third data point for §3/B11.
7. **How many third-party `PublicDataProvider` implementations exist** — R5 and
   R8 are breaking for implementers and this is unknown.

---

## §9 A stale doc that points at itself

`packages/contracts/docs/keep-state-pipeline.md:52-66` says *"**Three** members of
the engine's result are dropped"* and *"`result` is plain data and could be
carried. **It is dropped because nothing reads it**."*

False in every part on this branch: `Ledger8Transcript` picks `'result'`
(`internal/ledger8-pipeline.ts:79`), `Ledger8CallPipelineResult.result` is
declared at `:406` with a docblock saying the opposite,
`Ledger8CallResultPrivate.result` exists at `ledger8-contract.ts:275`, and it is
populated at `internal/ledger8-entry.ts:988`.

The code flags its own staleness and then points straight at the stale text:
`ledger8-pipeline.ts:69-74` reads *"**Two** members … are deliberately left out.
`result` **USED to be** a third … @see {@link KeepStatePipeline} for which two"*
— and that `@see` resolves to the paragraph that still says three.
