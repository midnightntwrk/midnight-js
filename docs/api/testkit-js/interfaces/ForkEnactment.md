[**@midnight-ntwrk/testkit-js v5.0.0-beta.8**](../README.md)

***

## Properties

### appliedAtBlockHeight

> `readonly` **appliedAtBlockHeight**: `number`

The height of the block that applied the new code; the new runtime first executes at `appliedAt + 1`.

***

### newSpecVersion

> `readonly` **newSpecVersion**: `number`

The runtime spec version reported from the applying block's state onwards. Guaranteed to be
greater than [ForkEnactment.oldSpecVersion](#oldspecversion).

***

### oldSpecVersion

> `readonly` **oldSpecVersion**: `number`

The runtime spec version at block #1, i.e. the one genesis brought up.
