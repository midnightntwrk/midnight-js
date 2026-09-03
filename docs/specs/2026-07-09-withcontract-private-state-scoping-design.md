# Design Spec — Contract-scoped private state via `withContract(address)`

> **Status:** Draft for review (spec pipeline).
> **Date:** 2026-07-09
> **Author persona:** Senior systems architect.
> **Source:** `docs/devex/plan-set-contract-address.md` (baseline finding P1: `setContractAddress()` runtime-only footgun).

## 1. Problem & why

`PrivateStateProvider.setContractAddress(address)` sets a **mutable "current contract" pointer** on the provider that later `get`/`set`/`remove`/`clear`/`exportPrivateStates`/`importPrivateStates` calls implicitly read (`types/src/private-state-provider.ts:231`; Level impl `level-private-state-provider.ts:763-811`).

Two defects follow:

1. **Runtime-only footgun.** The address-dependent methods throw at call time if the pointer is unset (`level-...:767,808,847,912`). Nothing at the type level forces a contract scope before access.
2. **Race / cross-contract leak (correctness bug).** Because the pointer is shared per-provider, interleaved operations on one `providers` object corrupt each other: op A sets address X, op B sets Y, A then reads Y's state. Silent wrong-contract reads/writes.

The flow is entirely internal today — the pointer is set by 5 call sites in `contracts/` (`submit-deploy-tx.ts:100`, `find-deployed-contract.ts:261`, `submit-call-tx.ts:122,226`, `tx-interfaces.ts:77`) — so the leak is latent but real under any concurrent contract usage on a shared provider.

A related latent defect surfaced during design: `clear()` requires the address to be set but then wipes the **entire** private-state sub-level regardless of the address (`level-...:806-811` — `subLevel.clear()` ignores the `${address}:` prefix). Its contract is misleading and dangerous.

## 2. Requirements

- **R1** Remove the mutable-pointer footgun: obtaining an address-scoped accessor MUST require an address at the type level (compile-time, not runtime).
- **R2** Eliminate cross-contract state bleed: two concurrent operations on different contracts MUST NOT share mutable scope.
- **R3** Preserve existing storage layout and on-disk data (keys remain `${contractAddress}:${privateStateId}`); this is a code/API change, not a data migration.
- **R4** Keep signing-key operations unchanged (they already take an explicit `address` or are global; they were never affected by the pointer).
- **R5** Give `clear` honest, non-overloaded semantics: a per-contract clear and a global clear are distinct, named operations.
- **R6** Fail-fast: invalid usage fails at the earliest possible point (compile time where possible, otherwise construction/first-call).
- **R7** Scoped `exportPrivateStates`/`importPrivateStates`/`clear` MUST operate on **only the scoped contract's** states in the **Level** implementation — already true (export filters by the `${address}:` prefix at `level-...:864-872`; import writes through the prefix-scoped `set`); the refactor MUST preserve it. The testkit in-memory provider is **untested scaffolding** (§3): it adopts `withContract` mechanically so it compiles and the contract tests that use it work; its bulk-op scoping is neither fixed nor asserted. Covered by T4/T9, which run against **Level only**.

## 3. Scope

**In:**
- Reshape the `PrivateStateProvider` interface in `types/`.
- Introduce `ContractScopedPrivateStateProvider`.
- Update both implementations: Level (`level-private-state-provider`) and testkit in-memory (`in-memory-private-state-provider`).
- Migrate the 5 internal `contracts/` call sites and test mocks.
- Split `clear` into per-contract (`clear()` on the view) and global (`clearAllPrivateStates()` on the root). **Owner-approved scope addition beyond the source plan:** the source did not mention `clear`, but the current `clear()` wipes all contracts under a scoped-looking name (a dangerous latent bug), so the split lands here rather than as a follow-up.
- Author a migration note at `docs/releases/<version>/api-changes.md` (before/after: `setContractAddress` → `withContract`; address-scoped methods moved to the view; `clearAllPrivateStates` destructive warning; stale-impl hard-failure) plus a `CHANGELOG.md` breaking-change entry. Required content enumerated in §8.

**Out:**
- No deprecation shim — `setContractAddress` is removed outright (decision: all callers are internal; cleaner interface).
- No change to signing-key methods (R4).
- **`changePassword` stays on the ROOT as a store-wide rotation. Decision (SEC-1, revises ARCH-1).** Verified in code: password + salt are **per-store** (one `METADATA_KEY` per sublevel, `level-...:204,469-473`), and `rotateStorePassword` re-encrypts **all** store entries — the `shouldProceed` prefix is **only a proceed-gate** (`:450`), not a migration filter (every non-metadata entry is decrypted and re-encrypted, `:433,455`). So `changePassword` is inherently **store-wide**, not per-contract; putting it on a per-contract view would falsely imply isolation. It stays on the root (sibling to `changeSigningKeysPassword`), and its pointer-dependent prefix gate (`:1183,1192`) and `contractAddress === null` throw (`:1177`) are **removed** — a deliberate behaviour change making the store-wide semantics explicit. `changeSigningKeysPassword` (account-level, `:1201-1222`) is unchanged. Both remain Level-specific, outside the `types/` interface.
- **The in-memory provider is untested test scaffolding.** It adopts `withContract` mechanically (so it compiles and its scoped `get`/`set`/`remove` keep working for the contract tests that use it); its bulk-op (`clear`/`export`/`import`) scoping is **not** fixed and **not** tested. Behavioural scoping guarantees are proven on Level only (§7). Contract tests using the double must not rely on its per-contract `clear`/`export`/`import` semantics.
- No browser-storage work; no `createMidnightProviders`/facade work (tracked separately).

## 4. Architecture & components

Layer: this is a `types/` interface change — the top of the dependency chain (`types → … → midnight-js`). Every implementation and the `contracts/` layer update in lockstep in the same PR.

**Invariant (ARCH-4):** the **root** provider holds only cross-contract / global operations (`clearAllPrivateStates`, signing keys, and the store-wide `changePassword`); the **view** holds only single-contract operations. Every method obeys this — no exceptions (`changePassword` is global because password/salt is per-store, SEC-1).

**Placement / convention (ARCH-6):** `ContractScopedPrivateStateProvider` lives in the same module `types/src/private-state-provider.ts` and is barrel-exported alongside `PrivateStateProvider`. This scoped-view shape is a deliberate, isolated deviation from the flat provider interfaces — it is **not** a pattern to generalize to the other provider interfaces absent a driving need.

**Account dimension (ARCH-3):** storage is keyed on two dimensions — `accountId` (selects the sublevel, hashed, bound at provider construction, `level-...:169-175,742-758`) and `contractAddress` (the key prefix). `accountId` is intentionally **out** of the view API because it is fixed per provider today. If it ever becomes dynamic, the intended extension is chained views `withAccount(id).withContract(address)` — **not** overloading `withContract`.

### 4.1 Reshaped root interface

```ts
interface PrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any> {
  /** Obtain an immutable accessor scoped to one contract's private state. */
  withContract(address: ContractAddress): ContractScopedPrivateStateProvider<PSI, PS>;

  // Global private-state operation (renamed from the old global-wipe `clear()`).
  // ⚠ DESTRUCTIVE & IRREVERSIBLE: wipes ALL contracts' private-state entries across the store.
  // Clears ONLY private-state entries; signing keys are left to clearSigningKeys() (SEC-3).
  clearAllPrivateStates(): Promise<void>;

  // Signing keys — UNCHANGED (already address-explicit or global):
  setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void>;
  getSigningKey(address: ContractAddress): Promise<SigningKey | null>;
  removeSigningKey(address: ContractAddress): Promise<void>;
  clearSigningKeys(): Promise<void>;
  exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport>;
  importSigningKeys(data: SigningKeyExport, options?: ImportSigningKeysOptions): Promise<ImportSigningKeysResult>;

  // REMOVED: setContractAddress; the address-scoped operations move to the scoped view.
}
```

### 4.2 Scoped view

```ts
interface ContractScopedPrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any> {
  get(privateStateId: PSI): Promise<PS | null>;
  set(privateStateId: PSI, state: PS): Promise<void>;
  remove(privateStateId: PSI): Promise<void>;
  /** Clears ONLY this contract's private states (prefix-scoped). */
  clear(): Promise<void>;
  exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport>;
  importPrivateStates(data: PrivateStateExport, options?: ImportPrivateStatesOptions): Promise<ImportPrivateStatesResult>;
}
```

Naming note: on the scoped view `clear()` unambiguously means "clear this contract" (the view *is* the contract scope); the root's global wipe is renamed `clearAllPrivateStates()`. This realises the "per-contract clear on the view + global clear on the root" decision.

**No Level-specific view extension (SEC-1, revises ARCH-1/DEV-3):** `withContract` returns a plain `ContractScopedPrivateStateProvider` in both implementations. Level's `changePassword`/`changeSigningKeysPassword` stay on the **root** return type — the Level factory already extends `PrivateStateProvider` with these via a named intersection (`level-...:720`); keep that shape (a named local type in the Level package, not `types/`, no cast, per DEV-3). There is no per-contract rotation to model on the view.

### 4.3 Implementation shape

- `withContract(address)` returns a **fresh, stateless closure** over `address` each call — no shared mutable field. The old `let contractAddress` field and its null-guards are deleted.
- Scoped keys are computed from the closed-over `address` (`${address}:${privateStateId}`), exactly as today, so storage layout is unchanged (R3).
- Scoped `clear()` MUST delete only keys prefixed `${address}:` (prefix-range delete), fixing the latent global wipe (R5).
- `clearAllPrivateStates()` retains the old global `subLevel.clear()` behaviour under an honest name.
- **No `this` (DEV-2).** `importPrivateStates` currently calls `this.get`/`this.set` for conflict checks and writes (`level-...:987,1004,1017`). Both providers are factory-returned object literals, where `this`-typing is fragile and binding breaks if a method is destructured. The view MUST NOT rely on `this`: it closes over local `scopedGet`/`scopedSet` helpers (derived from the closed-over `address`) and `importPrivateStates` calls those directly, so it is self-consistent regardless of call style.
- `changePassword` (Level) **stays on the root** and becomes an explicit **store-wide** rotation: its `contractAddress === null` throw (`:1177`) and prefix gate (`:1183,1192`) are removed, so it rotates the whole private-state store's password — matching the per-store salt it already writes (`:469-473`). `changeSigningKeysPassword` and the encryption-cache helpers are unchanged.
- **In-memory (test scaffolding):** adopt `withContract(address)` mechanically — scoped `get`/`set`/`remove` derive keys from the closed-over `address` and keep working. Its `clear`/`export`/`import` are left whole-record and are **neither fixed nor tested** (untested scaffolding; behavioural guarantees are on Level).

## 5. Data flow (contracts layer)

The address is often set **eagerly** at one point but private state is accessed **later**, inside a helper or a returned closure. The scoped view must be threaded to the actual access point — it is **not** always an adjacent one-liner rewrite. Per call site:

| Call site (address set) | Where private state is actually accessed | Migration |
|--------------------------|-------------------------------------------|-----------|
| `submit-deploy-tx.ts:100` | local, adjacent | Local rewrite → `withContract(addr).set/get`. |
| `find-deployed-contract.ts:261` | inside helper `setOrGetInitialPrivateState(...)` (accesses at `:88,91`, called at `:277`) | Change the helper to take a `ContractScopedPrivateStateProvider` (or the address) instead of the root provider; pass `withContract(addr)`. |
| `submit-call-tx.ts:122` | later, inside `createUnprovenCallTx` | Thread the scoped view into `createUnprovenCallTx`; do not rely on a pre-set pointer. |
| `submit-call-tx.ts:226` | later (async call path) | Same as `:122` — pass the scoped view to the access point. |
| `tx-interfaces.ts:77` (`createCircuitCallTxInterface`) | later, inside the returned circuit-call reducer closures | Capture the scoped view in the closure factory and use it inside the reducer closures. |

Signatures that must change to carry the scoped view: `setOrGetInitialPrivateState`, `createUnprovenCallTx`, and the `createCircuitCallTxInterface` reducer closures. Because each access derives its own scoped view, concurrent deploy/call flows on a shared `providers` object no longer interfere (R2). Simple adjacent rewrite (`withContract(addr).get(id)`) applies only to `submit-deploy-tx.ts`.

## 6. Error handling

- The "Contract address not set" throws are **deleted** — the condition is unrepresentable once scope is a required argument (R1/R6). This includes the throws on `get`/`set`/`remove`/`clear`/`exportPrivateStates`/`importPrivateStates` **and** on Level's `changePassword` (`level-...:1177`).
- All other documented throws (password-strength, decryption failure, rotation-lock timeout, store I/O) are preserved verbatim on the moved methods.
- No error is downgraded or swallowed; failures propagate with `cause` as today.
- **Error context (QA-9).** Decryption-failure and stale-provider errors MUST carry enough context to diagnose in the field — the offending `privateStateId` and that the entry was undecryptable / the missing capability — **without leaking plaintext or secrets** — propagated via `cause`. T11b and T13 assert the presence of this context, not merely that an error is thrown.

## 7. Testing strategy (TDD)

Tests written first, watched RED, then GREEN. Behavioural scoping tests target the **Level** implementation — the in-memory provider is untested scaffolding (§3).

- **T1 (roundtrip — Level):** `withContract(a).set(id, x)` then `withContract(a).get(id)` returns `x`; `withContract(a).get(absentId)` returns `null`.
- **T2 (isolation — Level):** `withContract(A).set(id, x)`; `withContract(B).get(id)` returns `null` — no bleed.
- **T3 (race regression, deterministic — Level):** force the interleave with a controllable async gate. OLD code: `setContractAddress(A)`, begin `get`, resolve `setContractAddress(B)` before the awaited read completes → assert it returns B's value (RED). NEW code: `withContract(A).get` returns A's value regardless of interleave (GREEN). MUST be demonstrated to fail on pre-change code (hard gate); the interleave must be deterministic (no timing luck).
- **T4 (scoped clear — Level):** `withContract(A)` and `withContract(B)` have states; `withContract(A).clear()` removes only A's, B's remain.
- **T5 (clearAllPrivateStates — Level):** removes every contract's private states **and leaves signing keys intact** (asserts non-overlap with `clearSigningKeys()`, SEC-3).
- **T6 (type-level):** address-scoped operations are unreachable without `withContract`. Mechanism: a `private-state-provider.test-d.ts` fixture with `// @ts-expect-error` on `root.get(id)` / `root.set(id, s)` (and the other moved methods), under the package `tsc --noEmit` gate. Verification: confirm `.test-d.ts` is in the tsc project `include` and that an unused `@ts-expect-error` is an **error** (not a warning) under the package TS config; demonstrate RED by showing the directive on `root.get(id)` is flagged unused **before** the methods move off the root. If the package uses a type-test runner (tsd/expect-type) instead, use and name it.
- **T7 (signing keys unchanged — Level):** existing signing-key tests pass without modification.
- **T8 (storage compatibility — Level):** data written via the old key layout is readable via `withContract(addr).get` (R3).
- **T9 (scoped export/import — Level):** with states under `withContract(A)` and `withContract(B)`, `withContract(A).exportPrivateStates()` returns only A's; importing into `withContract(B)` writes only under B (R7).
- **T10 (store-wide password rotation — Level):** with states under multiple contracts, `changePassword(...)` on the root re-encrypts **all** private-state entries; every contract is decryptable under the **new** password and none under the old (SEC-1).
- **T11a (absent key → null — Level):** `withContract(a).get(missingId)` returns `null`.
- **T11b (decryption failure is never a silent null — negative, Level):** a scoped `get` whose stored entry fails to decrypt MUST throw (propagating `cause`), never `null`. Arrange by writing a valid entry then corrupting its stored ciphertext/salt out-of-band. Asserts the thrown error carries diagnostic context (the `privateStateId`, that the entry was undecryptable) **without leaking plaintext/secrets** (§6, SEC-5, QA-9).
- **T12 (aborted password rotation — Level):** with states under ≥2 contracts, inject a failure into `subLevel.batch` mid-rotation (stub the store `batch` to throw); assert every entry remains decryptable under the **old** password and none is orphaned (SEC-2 recovery contract).
- **T13 (stale provider fails loud — negative):** a `providers` whose `privateStateProvider` lacks `withContract` is rejected at the contracts-flow entry guard with a clear, identifiable message (assert on message content incl. the missing capability, QA-9), not merely that it throws (SEC-4).
- **T14 (scoped remove — Level):** `withContract(A).set(id,x)`, `withContract(B).set(id,x)`, `withContract(A).remove(id)` → `withContract(A).get(id)` is `null` AND `withContract(B).get(id)` is `x`.
- **T15 (contracts-flow regression):** an end-to-end deploy writes initial private state and a subsequent call reads it back correctly through the threaded scoped view — proving `setOrGetInitialPrivateState`, `createUnprovenCallTx`, and the `createCircuitCallTxInterface` reducer closures access the right contract. If existing contract/e2e tests already cover this, name them and require they pass unmodified.

Test placement note: all behavioural scoping tests (T1–T5, T8–T12, T14) target **Level**; the in-memory provider is untested scaffolding (§3). T6 is a type-level test (types package); T7 is Level; T13 (stale provider) and T15 (contracts-flow) are provider-agnostic / integration.

## 8. Acceptance criteria

**Consumer-facing outcomes:**
- [ ] A consumer using one shared `providers` object across concurrent deploy/call flows never reads or writes the wrong contract's private state (observable via T3).
- [ ] A consumer cannot invoke any address-scoped operation without first supplying an address — misuse is a compile error, not a runtime throw (observable via T6).
- [ ] `withContract(a).exportPrivateStates()` returns only contract `a`'s states; import is likewise contract-scoped (observable via T9).
- [ ] Migration note published at `docs/releases/<version>/api-changes.md` plus a `CHANGELOG.md` breaking-change entry, containing: (1) `setContractAddress → withContract` before/after; (2) the address-scoped methods moved to the view; (3) `clear` → per-contract `clear()` + the `clearAllPrivateStates()` rename with the **destructive** warning (SEC-3); (4) the stale-impl **hard runtime failure** note (SEC-4).
- [ ] A stale provider missing `withContract` is rejected at the contracts-flow entry guard with a clear, context-carrying error (T13).
- [ ] Deploy-then-read / call-then-read contract-flow behaviour verified (T15); existing contract tests pass unmodified.

**Implementation outcomes:**
- [ ] `setContractAddress` removed from the interface and both implementations; no "address not set" throw remains (including Level `changePassword`).
- [ ] `withContract(address)` returns a stateless per-call scoped view; no shared mutable address field.
- [ ] Scoped `clear()` is prefix-scoped (Level); `clearAllPrivateStates()` performs the global private-state wipe only (not signing keys).
- [ ] Level `changePassword` stays on the root as an explicit store-wide rotation (no pointer, no prefix gate); `changeSigningKeysPassword` unchanged.
- [ ] In-memory provider adopts `withContract` and compiles; it is untested scaffolding — its bulk-op scoping is neither fixed nor asserted.
- [ ] All 5 `contracts/` call sites and test mocks migrated.
- [ ] Signing-key API byte-for-byte unchanged.
- [ ] `yarn lint` + `tsc` clean; no unsafe `any`/`unknown` casts introduced.
- [ ] T1–T15 pass (incl. T11a/T11b); T3 demonstrably fails on the pre-change code (the cross-contract race the mutable pointer allows).

## 9. Risks & open items

- **Breaking `types/` interface (coordinate-tier).** Removes a public member with no shim; any external custom `PrivateStateProvider` implementation breaks. Owner decision — recommend landing on `5.x`-beta to avoid a later major bump. Commit/PR flagged breaking (`!` + BREAKING CHANGE footer).
- **`exportPrivateStates` / `importPrivateStates` — already contract-scoped in Level; preserve it.** Confirmed in code: export filters by the `${address}:` prefix (`level-...:864-872`) and import writes via the scoped `set` (`level-...:1017`). Unlike `clear`, these are **not** a global-wipe bug. The refactor must carry the existing prefix logic onto the scoped view unchanged (asserted on Level by T9).
- **Concurrency limits.** `withContract` removes the shared-pointer race, but underlying store-level concurrency (rotation locks) is unchanged and out of scope.
- **View lifecycle is cheap and stateless (ARCH-5).** `withContract` creates a fresh stateless closure per call; the per-call sublevel open/close cost (Level `withSubLevel`, `level-...:188-199`) is unchanged from today. The ergonomic may invite tighter loops than the old set-once pattern, but caching/reusing views is **explicitly out of scope** — it would reintroduce the mutable lifecycle this refactor removes.
- **In-memory is untested scaffolding.** It adopts `withContract` to compile (scoped `get`/`set`/`remove` derive keys from the closed-over `address`); its bulk-op (`clear`/`export`/`import`) scoping is neither fixed nor tested. Accepted risk: contract tests that use the double must not depend on its per-contract `clear`/`export`/`import` semantics. All behavioural scoping guarantees (R5, R7, SEC-1) are asserted on Level (T4/T9/T10/T11/T12/T14). If the in-memory provider is ever promoted to a non-test role, this must be revisited.
- **Password/salt is per-store, not per-contract (SEC-1).** Verified: one `METADATA_KEY`/salt per sublevel; `rotateStorePassword` re-encrypts **all** entries (prefix is a proceed-gate only). Hence `changePassword` is store-wide and lives on the root — **not** a per-contract view method. No contract is left undecryptable by a rotation (T10). Any future need for genuinely per-contract rotation would require per-contract salt/key derivation (out of scope).
- **Password-rotation atomicity & recovery (SEC-2).** `rotateStorePassword` re-encrypts all entries and writes the new salt in one `subLevel.batch` (`:474-485`); the per-store rotation lock (`:1181`) serializes concurrent rotations. On batch failure the store may be mixed-state — the recovery contract is to retain both old and new passwords until integrity is verified. Test: an aborted rotation must not leave any entry readable under *neither* password.
- **`clearAllPrivateStates()` is destructive and irreversible (SEC-3).** It wipes all contracts' encrypted private state with no undo. TSDoc and the migration note MUST flag it as destructive/global; callers should guard it behind explicit user confirmation. Naming stays `clearAllPrivateStates` (distinct from the per-contract `clear()`); T5 asserts it does not touch signing keys.
- **Stale external implementation must fail loud (SEC-4).** With no shim, an out-of-date `PrivateStateProvider` lacking `withContract` must not silently misbehave (e.g. a retained mutable-pointer impl driven through a wrong-contract path). A **single capability guard at the entry of the `contracts/` flow** asserts `typeof providers.privateStateProvider.withContract === 'function'` and throws a clear, context-carrying error otherwise (one place, not per call site). Verified by T13; the migration note flags this as a hard runtime failure, not a soft break.
