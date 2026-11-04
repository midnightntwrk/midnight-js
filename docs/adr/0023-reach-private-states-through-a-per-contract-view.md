# 0023. Reach private states through a per-contract view

- Status: Accepted
- Date: 2026-11-04
- Deciders: Szymon Paluchowski
- Related: #812

## Context

`PrivateStateProvider` kept one mutable contract address, set by
`setContractAddress`. `get`, `set`, `remove`, `exportPrivateStates` and
`importPrivateStates` read it when they ran.

The framework set the address at the start of a deploy, find or call, then
waited seconds or minutes for a proof, a submit and a confirmation, and only
then read or wrote the private state. A second flow on the same provider for
another contract could set its own address in that window. The first flow then
read or wrote the second contract's state. The level provider's export and
import also read the address after their own awaits.

The address was the only ambient state on the provider. The signing-key
methods already took the address as an argument.

`clear()` required an address but removed the states of every contract.
`changePassword()` of the level provider required an address but re-encrypted
the whole store, because the password and the salt belong to the store, not to
a contract. When that contract had no states, it re-encrypted nothing and still
reported success.

The address was used as a key exactly as given, so `'AB…'` and `'ab…'` named
two different stores for one contract.

## Decision

We will reach private states through a view that fixes the contract address
when it is created: `provider.forContract(address)` returns a
`ContractPrivateStates` with `get`, `set`, `remove`, `clear`,
`exportPrivateStates` and `importPrivateStates`.

- The provider keeps only what spans contracts: `forContract`, `clearAll` and
  the signing-key methods. `setContractAddress` and the unscoped private-state
  methods are removed.
- `forContract` refuses an invalid address with `InvalidArgumentError`, and
  the view names its contract in `contractAddress`.
- Contract addresses are compared in lower case, for private states and for
  signing keys.
- The view's `clear` removes one contract's states. `clearAll` on the provider
  removes every contract's states of the account. The two names differ so a
  caller cannot mistake one scope for the other.
- `changePassword` of the level provider takes no address and always
  re-encrypts the whole store. It no longer skips the rotation when one
  contract has no states.
- The export format does not change. An export holds one contract's states,
  decrypts only that contract's entries, and an import writes into the contract
  of the view.
- `accountId` of the level provider is documented as the wallet's coin public
  key for a new store. An existing store keeps the value it was created with.

## Consequences

- **Positive:** two views never share an address, so concurrent flows on
  different contracts cannot cross, in any implementation of the interface. A
  missing address is a compile error, not a runtime `ConfigurationError`.
- **Positive:** private states and signing keys are addressed the same way:
  the caller names the contract.
- **Negative:** breaking change for every caller and every implementation of
  `PrivateStateProvider`. The framework no longer leaves the provider
  "pointed at" the last contract it touched; code that relied on that names
  the address itself.
- **Negative:** testkit-js now passes the coin public key as `accountId`
  unchanged, so a testkit database from an earlier pre-release is not read.

## Alternatives considered

- **Set the address again right before each `get`/`set`.** Rejected: it only
  works while every implementation reads the address synchronously, which the
  type system cannot enforce.
- **Pass the address to every private-state method.** Rejected: every call
  repeats the address, where a view names it once.
- **A provider bound to one contract at creation.** Rejected: one
  `MidnightProviders` serves many contracts in deploy, find and call.
- **A lock that runs one flow at a time.** Rejected: it serializes proofs that
  take minutes.
- **`AsyncLocalStorage`.** Rejected: Node.js only.
