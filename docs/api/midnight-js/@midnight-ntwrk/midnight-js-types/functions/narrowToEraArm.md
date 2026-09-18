[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / narrowToEraArm

# Function: narrowToEraArm()

> **narrowToEraArm**\<`T`, `H`\>(`payload`, `seam`, `retainedEras`): [`EraArmRequest`](../type-aliases/EraArmRequest.md)\<`T`, `H`\>

Narrows a version-tagged payload onto the arm that serves it, refusing an arm
no handler was registered for.

This is `unwrapV9` generalised to a provider that serves more than one era,
and it reports the same two errors for the same two reasons — so widening a
provider to a second era does not change what a caller catches when it sends
an era that provider still does not serve.

## Type Parameters

### T

`T`

### H

`H`

## Parameters

### payload

[`VersionedTx`](../type-aliases/VersionedTx.md)\<`T`\>

The version-tagged payload that arrived at the seam.

### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method being implemented, used in error messages.

### retainedEras

`Partial`\<`Readonly`\<`Record`\<`"v8"`, `H`\>\>\> \| `undefined`

The retained arms this provider was built with.

## Returns

[`EraArmRequest`](../type-aliases/EraArmRequest.md)\<`T`, `H`\>

The arm to run, and the payload it takes.

## Throws

V8PayloadUnsupportedError if the payload carries a retained era for
        which no handler was registered.

## Throws

UntaggedPayloadError if `version` is missing or unrecognised. The
        types make that unrepresentable, so it is reachable only from
        JavaScript, from a consumer built against a pre-5.0.0
        `midnight-js-types`, or across an untyped boundary.
