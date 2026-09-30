[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ConstructorResultPojo

# Interface: ConstructorResultPojo

The freshly built state a retained-era constructor produced.

## Properties

### contractState

> `readonly` **contractState**: `ContractState`

***

### privateState

> `readonly` **privateState**: `unknown`

***

### signingKey

> `readonly` **signingKey**: `string`

The key the state's maintenance authority was built from: the caller's own
when one was named, otherwise the one compact-js sampled.

REQUIRED, unlike the request's, and that asymmetry is the point — a sampled
key exists nowhere else, so a result that did not report it would leave the
deployment as unmaintainable as the empty committee the retained
constructor writes on its own.

***

### zswapLocalState

> `readonly` **zswapLocalState**: `ZswapLocalState`
