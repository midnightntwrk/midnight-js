# 0023. Reach private states through a per-contract view

- Status: Accepted
- Date: 2026-11-04

## Context

Private states belong to a contract. A provider that keeps one mutable "current contract address"
and reads it when each operation runs is unsafe. The framework starts a deploy, find or call,
then waits seconds or minutes for a proof, a submit and a confirmation, and only then reads or
writes the private state. A second flow on the same provider for another contract can change the
address in that window, and the first flow then reads or writes the other contract's state.
Export and import that read the address after their own awaits have the same race.

Some operations are not per contract at all. Clearing everything spans all contracts. Changing the
storage password re-encrypts the whole store, because the password and salt belong to the store,
not to a contract. Signing-key methods already take the address as an argument.

An address used as a key exactly as given makes `'AB…'` and `'ab…'` two different stores for one
contract.

## Decision

We will reach private states through a view that fixes the contract address when it is created:
`provider.forContract(address)` returns a `ContractPrivateStates` with `get`, `set`, `remove`,
`clear`, `exportPrivateStates` and `importPrivateStates`.

- `PrivateStateProvider` keeps only what spans contracts: `forContract`, `clearAll` and the
  signing-key methods. It has no mutable address.
- `forContract` refuses an invalid address with `InvalidArgumentError`. The view names its
  contract in `contractAddress`.
- Contract addresses are compared in lower case, for private states and for signing keys.
- The view's `clear` removes one contract's states. The provider's `clearAll` removes the states
  of every contract of the account. The names differ so a caller cannot mistake one scope for the
  other.
- `changePassword` of the level provider takes no address and always re-encrypts the whole store,
  including when a contract has no states.
- An export holds one contract's states and decrypts only that contract's entries. An import
  writes into the view's contract.
- `accountId` of the level provider is documented as the wallet's coin public key for a new store.
  An existing store keeps the value it was created with.

## Consequences

- **Positive:** two views never share an address, so concurrent flows on different contracts
  cannot cross, in any implementation of the interface. A missing address is a compile error.
- **Positive:** private states and signing keys are addressed the same way: the caller names the
  contract.
- **Negative:** a breaking change for every caller and every implementation of
  `PrivateStateProvider`. The provider is never left "pointed at" the last contract the framework
  touched; code that relied on that names the address itself.

## Alternatives considered

- **Set the address again right before each `get`/`set`.** Rejected: it only works while every
  implementation reads the address synchronously, which the type system cannot enforce.
- **Pass the address to every private-state method.** Rejected: every call repeats the address,
  where a view names it once.
- **A provider bound to one contract at creation.** Rejected: one `MidnightProviders` serves many
  contracts in deploy, find and call.
- **A lock that runs one flow at a time.** Rejected: it serializes proofs that take minutes.
- **`AsyncLocalStorage`.** Rejected: Node.js only.
