# 0003. Prefer interfaces over object-type aliases for named object types

- Status: Accepted
- Date: 2026-07-10
- Deciders: Szymon Paluchowski
- Related: PR #629

## Context

TypeScript renders `type` aliases and `interface` declarations differently in
IDE tooltips. An object-type alias, and especially an intersection of them, is
expanded inline: hovering shows every constituent field, recursively, as a
multi-line blob. An `interface` is displayed by name.

`packages/contracts` exposes the framework's transaction model — deep
inheritance chains such as `FinalizedCallTxData` built from `UnsubmittedCallTxData`,
`CallResult`, `UnsubmittedTxData`, and `FinalizedTxData`. As plain intersection
aliases these produced tooltips a consumer could not read at a glance, which is
the first thing a developer sees when working against the public API.

Interfaces and object-type aliases are structurally compatible, so the choice
is a display/authoring convention rather than a change to the type system.
Three constraints bound where the convention can apply:

- A union (`A | B`) has no interface form.
- A conditional type (`X extends [] ? A : B`), and any alias derived from one,
  cannot be an interface, nor can an interface `extends` one.
- An interface may only `extends` a statically-known object type, so mapped
  types and utility-type aliases (`Record`, `Pick`, `Omit`) and bare renames
  of another generic type stay as aliases.

A subtler case: an intersection that *overrides* an inherited property to a
narrower type (`Base & { private: Narrower }`) merges the two via intersection,
whereas an interface that redeclares the property replaces it and requires the
replacement to be assignable to the inherited one.

## Decision

We will declare named object types as `interface`, and intersections of object
types as `interface … extends …`, throughout `packages/contracts`, and apply
the same convention to new object types added across the framework going
forward.

We will keep `type` where an interface cannot express the shape: unions,
conditional types and anything derived from them, mapped types, utility-type
aliases (`Record`/`Pick`/`Omit`), function types, and bare aliases that only
rename or re-parameterize another type. The TypeScript compiler is the arbiter —
if a conversion fails to compile (including under declaration emit), it stays a
`type`.

Where an intersection overrides an inherited property, we will introduce a named
helper interface that `extends` the combined members (for example
`FinalizedCallTxPublicData extends CallResultPublic, FinalizedTxData`) and
reference it from the redeclared property, so the property stays assignable to
the base and the resulting type is unchanged.

## Consequences

- **Positive:** IDE tooltips show the interface name instead of an expanded
  field chain. The change is structurally identical to the previous aliases, so
  it is not a breaking change. Interfaces also support declaration merging if a
  consumer ever needs to augment a type.
- **Negative:** The codebase now mixes `interface` and `type` — types that
  depend on conditionals or utilities must remain aliases. This is a language
  constraint, not a style inconsistency to be "fixed". Interfaces can be
  accidentally declaration-merged if a consumer redeclares the same name in
  scope. Representing overridden-property intersections adds four exported
  helper interfaces (`UnsubmittedDeployTxPrivateDataFull`,
  `FinalizedDeployTxPublicData`, `UnsubmittedCallTxPrivateData`,
  `FinalizedCallTxPublicData`), widening the public API surface.
- **Follow-ups:** The convention is applied to `packages/contracts` now
  (PR #629). It is not applied retroactively to the other packages; new object
  types there should follow it as they are written or touched.

## Alternatives considered

- **Keep every declaration as a `type` alias:** rejected — this is the status
  quo that produced unreadable tooltips for the transaction-model chain.
- **Convert everything, including unions and conditionals:** impossible —
  TypeScript does not allow unions, conditionals, or their derivatives to be
  interfaces.
- **Flatten tooltips with an identity/`Prettify` mapped helper instead of
  interfaces:** rejected — it adds a utility-type indirection to every
  declaration and still expands the fields inline; using interfaces is the
  idiomatic fix and needs no wrapper.
