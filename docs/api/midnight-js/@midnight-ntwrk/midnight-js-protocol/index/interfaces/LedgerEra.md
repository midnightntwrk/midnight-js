[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / LedgerEra

# Interface: LedgerEra

One ledger era, as a single object a caller holds and calls.

Both eras expose the SAME methods with the same signatures. Which era an
object is bound to is readable from [LedgerEra.version](#version) and nowhere
else — a caller that has resolved the era for a record (see
`protocolVersionToLedger` in `../../version.ts`) hands that value to
`loadLedgerEra` once and then writes era-agnostic code.

Every value crossing this boundary is plain data: `Uint8Array`s and plain
objects, never a live WASM handle, so a result outlives the module that
produced it and survives a `structuredClone` or a worker boundary.

The methods are synchronous. Asking for an era is the point at which its
runtime is acquired, so by the time a caller holds one of these there is
nothing left to await.

## See

[EraSeam](../../documents/EraSeam.md)

## Properties

### version

> `readonly` **version**: `"v8"` \| `"v9"`

The era this object is bound to — the value that was passed to `loadLedgerEra`.

## Methods

### composeCallTx()

> **composeCallTx**(`options`): `Uint8Array`

Composes an UNPROVEN call transaction and serializes it.

The returned bytes are what `Transaction.serialize()` produces before
`.prove()` is ever called; proving needs a proving provider and a running
proof server, neither of which this seam has.

The two eras are not equivalent here, and the difference is deliberate
rather than hidden: the retained pre-fork era composes exactly one call,
because a cross-contract call is a ledger-9-only feature a pre-fork
contract cannot emit. The refusal is raised, never worked around. A Zswap
offer is NOT refused on either era.

#### Parameters

##### options

[`ComposeCallOptions`](ComposeCallOptions.md)

The calls to compose and the transaction-wide envelope.

#### Returns

`Uint8Array`

The serialized UNPROVEN transaction.

#### Throws

ComposeOptionError if an option is unusable on this era — an
empty `networkId`, an invalid `ttl`, undecodable offer or state bytes, or
a call tree with more than one entry on the retained pre-fork era.

#### Throws

ComposeFailedError if a call cannot be assembled; `stage` names
which step refused it.

#### See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md)
 - [EraSeam](../../documents/EraSeam.md)

***

### composeDeployTx()

> **composeDeployTx**(`options`): [`DeployResultPojo`](DeployResultPojo.md)

Composes an UNPROVEN deploy transaction and returns it together with the
address the deployment will have and the initial state that address was
derived from.

The address cannot be recomputed from the state a caller passed in — a
deploy mints a fresh nonce — which is why it is returned rather than left
to the caller to derive.

#### Parameters

##### options

[`ComposeDeployOptions`](ComposeDeployOptions.md)

The initial state, its verifier keys, and the
transaction-wide envelope.

#### Returns

[`DeployResultPojo`](DeployResultPojo.md)

The serialized UNPROVEN transaction, the address the deployment
will have, and the initial state that address was derived from.

#### Throws

ComposeOptionError if an option is unusable on this era — an
empty `networkId`, an invalid `ttl`, undecodable state bytes, or an
omitted `verifierKeys` for a state that still declares a blank key.

#### Throws

ComposeFailedError if the supplied keys do not match the state's
declared entry points, or if the ledger rejects a key blob; `stage` names
which check refused it.

#### See

 - [VerifierKeys](../../documents/VerifierKeys.md)
 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md)

***

### decodeContractState()

> **decodeContractState**(`raw`): [`ContractStatePojo`](ContractStatePojo.md)

Reads a raw, serialized contract-state envelope written by this era into
plain data: its primary state, and the entry points it declares with the
verifier key registered against each.

#### Parameters

##### raw

`Uint8Array`

The serialized contract-state envelope.

#### Returns

[`ContractStatePojo`](ContractStatePojo.md)

The decoded state. A `verifierKey` absent on an entry point means
that slot was never deployed, not that the key is empty.

#### Throws

StateDecodeFailedError if this era's decoder rejects `raw`, or if
the state cannot resolve an entry point it declares itself.

#### See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

***

### extractState()

> **extractState**(`raw`): [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

Reads the primary state out of a raw, serialized contract-state envelope
written by this era.

Fails closed on an envelope this era cannot read — including one written
by the other era — rather than returning a partial or empty state. The
failure is a `StateDecodeFailedError` naming this era, the same class
[LedgerEra.decodeContractState](#decodecontractstate) raises, with the decoder's own
diagnosis on `cause`.

#### Parameters

##### raw

`Uint8Array`

The serialized contract-state envelope.

#### Returns

[`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The primary state read out of the envelope.

#### Throws

StateDecodeFailedError if this era's decoder rejects `raw`.

#### See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

***

### partitionCallTranscript()

> **partitionCallTranscript**(`options`): [`PartitionedCallTranscript`](../type-aliases/PartitionedCallTranscript.md)

Resolves one call's guaranteed/fallible transcript pair, without composing
a transaction.

PROTOTYPE SEAM. A caller that has to route a Zswap coin into the right
segment needs the partition BEFORE it builds the offer, and `composeCallTx`
computes the partition only after the offer has been handed to it as an
option. Without this the retained-era pipeline places every coin movement
in the guaranteed segment and the wallet cannot balance the result.

#### Parameters

##### options

[`EraPartitionCallOptions`](EraPartitionCallOptions.md)

The call's transcript source, address, circuit and the
chain's own serialized ledger parameters.

#### Returns

[`PartitionedCallTranscript`](../type-aliases/PartitionedCallTranscript.md)

The `[guaranteed, fallible]` pair, either member possibly absent.

#### Throws

ComposeFailedError, ComposeOptionError as `composeCallTx` does for
the same inputs.
