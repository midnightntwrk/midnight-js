[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / WatchTimeoutError

# Class: WatchTimeoutError

Raised when a `watchFor*` call given `maxWaitMs` finds nothing within that
bound. The wait is abandoned and polling stops. The data may still appear:
if it depends on a transaction you submitted, check the chain before
submitting again.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new WatchTimeoutError**(`operation`, `target`, `maxWaitMs`): `WatchTimeoutError`

#### Parameters

##### operation

[`WatchOperation`](../type-aliases/WatchOperation.md)

The method that gave up waiting.

##### target

`string`

The transaction id or contract address it waited for.

##### maxWaitMs

`number`

The bound that elapsed.

#### Returns

`WatchTimeoutError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_WATCH_TIMED_OUT"` = `WATCH_TIMED_OUT`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### maxWaitMs

> `readonly` **maxWaitMs**: `number`

The bound that elapsed.

***

### operation

> `readonly` **operation**: [`WatchOperation`](../type-aliases/WatchOperation.md)

The method that gave up waiting.

***

### target

> `readonly` **target**: `string`

The transaction id or contract address it waited for.
