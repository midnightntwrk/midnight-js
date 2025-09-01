[**Midnight.js API Reference v2.0.2**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-testing](../README.md) / getTestEnvironment

# Function: getTestEnvironment()

> **getTestEnvironment**(`logger`): [`DevnetTestEnvironment`](../classes/DevnetTestEnvironment.md) \| [`EnvVarRemoteTestEnvironment`](../classes/EnvVarRemoteTestEnvironment.md) \| [`LocalTestEnvironment`](../classes/LocalTestEnvironment.md) \| [`QanetTestEnvironment`](../classes/QanetTestEnvironment.md) \| [`TestnetTestEnvironment`](../classes/TestnetTestEnvironment.md) \| [`Testnet2TestEnvironment`](../classes/Testnet2TestEnvironment.md)

Returns the appropriate test environment based on the MN_TEST_ENVIRONMENT variable.

## Parameters

### logger

`Logger`

The logger instance to be used by the test environment.

## Returns

[`DevnetTestEnvironment`](../classes/DevnetTestEnvironment.md) \| [`EnvVarRemoteTestEnvironment`](../classes/EnvVarRemoteTestEnvironment.md) \| [`LocalTestEnvironment`](../classes/LocalTestEnvironment.md) \| [`QanetTestEnvironment`](../classes/QanetTestEnvironment.md) \| [`TestnetTestEnvironment`](../classes/TestnetTestEnvironment.md) \| [`Testnet2TestEnvironment`](../classes/Testnet2TestEnvironment.md)

The selected test environment instance.
