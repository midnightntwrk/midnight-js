# 0003. Prefer interfaces over object-type aliases for named object types

- Status: Accepted
- Date: 2026-07-10

## Context

TypeScript shows `type` aliases and `interface` declarations differently in IDE tooltips. An
object-type alias, and above all an intersection of them, is expanded inline: hovering shows every
field, recursively, as a long block. An `interface` is shown by its name.

`packages/contracts` exposes the framework's transaction model as deep chains, for example
`Ledger9FinalizedCallTxData` built from `Ledger9UnsubmittedCallTxData`, `Ledger9CallResult`,
`Ledger9UnsubmittedTxData` and `Ledger9FinalizedTxData`. As plain intersection aliases these
gave tooltips a developer could not read at a glance, and the tooltip is the first thing a
developer sees of the public API.

Interfaces and object-type aliases are structurally compatible, so this is a display and authoring
convention, not a change to the type system. The language limits where it can apply:

- A union (`A | B`) has no interface form.
- A conditional type, and any alias derived from one, cannot be an interface, and an interface
  cannot `extends` one.
- An interface can only `extends` a statically known object type. Mapped types, utility-type
  aliases (`Record`, `Pick`, `Omit`) and bare renames of another generic type stay aliases.

One case needs care. An intersection that narrows an inherited property
(`Base & { private: Narrower }`) merges the two types. An interface that redeclares the property
replaces it, and the replacement must be assignable to the inherited one.

## Decision

We will declare named object types as `interface`, and intersections of object types as
`interface … extends …`, throughout `packages/contracts`. New object types anywhere in the
framework follow the same convention.

We will keep `type` where an interface cannot express the shape: unions, conditional types and
anything derived from them, mapped types, utility-type aliases, function types, and bare aliases
that only rename or re-parameterize another type. The compiler decides: if a conversion fails to
compile (including declaration emit), it stays a `type`.

Where an intersection narrows an inherited property, we will add a named helper interface that
`extends` the combined members and reference it from the redeclared property. For example,
`Ledger9FinalizedCallTxPublicData extends Ledger9CallResultPublic, Ledger9FinalizedTxData`. The
property stays assignable to the base, and the resulting type is unchanged.

## Consequences

- **Positive:** IDE tooltips show the interface name instead of an expanded field chain. The
  change is structurally identical to the aliases, so it breaks no consumer. Interfaces also allow
  declaration merging if a consumer ever needs to augment a type.
- **Negative:** the codebase mixes `interface` and `type`. Types built on conditionals or
  utilities must stay aliases; this is a language limit, not an inconsistency to fix.
- **Negative:** a consumer that redeclares the same name in scope can merge into an interface by
  accident.
- **Negative:** the helper interfaces for narrowed properties widen the public API:
  `Ledger9UnsubmittedDeployTxPrivateDataFull`, `Ledger9FinalizedDeployTxPublicData`,
  `Ledger9UnsubmittedCallTxPrivateData` and `Ledger9FinalizedCallTxPublicData`.
- **Follow-up:** the convention is not applied retroactively to the other packages. Their object
  types follow it as they are written or touched.

## Alternatives considered

- **Keep every declaration as a `type` alias.** Rejected: this produced the unreadable tooltips.
- **Convert everything, including unions and conditionals.** Impossible: TypeScript does not
  allow these as interfaces.
- **Flatten tooltips with a `Prettify`-style mapped helper.** Rejected: it adds a wrapper to every
  declaration and still expands the fields inline. Interfaces are the idiomatic fix.
