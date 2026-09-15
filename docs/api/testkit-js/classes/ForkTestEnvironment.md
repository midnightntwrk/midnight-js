[**@midnight-ntwrk/testkit-js v5.0.0-beta.8**](../README.md)

***

A chain whose genesis carries the ledger-v8 runtime, running on the ledger-v9 node binary, plus
the governance call that moves it across the boundary.

A test that wants the fork constructs this class directly -- `getTestEnvironment` never returns
it. Why it is a sibling of the other environments rather than a mode of one, and why it runs two
proof servers, is recorded in `docs/architecture/fork-e2e-environment.md`.

Wallets are not supported here; [ForkTestEnvironment.startMidnightWalletProviders](#startmidnightwalletproviders) refuses.

## Example

```ts
const environment = new ForkTestEnvironment(logger);
const preFork = await environment.start();          // chain is on the ledger-v8 runtime
const { appliedAtBlockHeight } = await environment.enactFork(); // governance set_code, finalized past
const postFork = environment.getEnvironmentConfiguration(); // now points at the v9 proof server
```

## Extends

- [`TestEnvironment`](TestEnvironment.md)

## Constructors

### Constructor

> **new ForkTestEnvironment**(`logger`): `ForkTestEnvironment`

#### Parameters

##### logger

`Logger`

#### Returns

`ForkTestEnvironment`

#### Overrides

[`TestEnvironment`](TestEnvironment.md).[`constructor`](TestEnvironment.md#constructor)

## Accessors

### composeProject

#### Get Signature

> **get** **composeProject**(): `string`

The compose project this stack runs under.

Exposed so a caller can drive the same project itself -- `compose run
--profile tools toolkit ...` for a node-side reading, say -- and reach the
node under its service name rather than through a mapped port.

##### Returns

`string`

***

### hasForked

#### Get Signature

> **get** **hasForked**(): `boolean`

Whether [ForkTestEnvironment.enactFork](#enactfork) has already moved this chain across the boundary.

##### Returns

`boolean`

## Methods

### captureContainerLogs()

> **captureContainerLogs**(`directory`): `Promise`\<`string`[]\>

Writes each stack container's logs into `directory`, one file per service, and answers with the
paths written.

For the failures the framework's own errors cannot explain. A submission the NODE rejects
surfaces as `SubmissionError: Transaction submission error` with no reason on it, and the seam
that wraps it redacts the provider's message deliberately -- so the only account of WHY the
chain refused is in the node's log.

`docker compose logs` WITHOUT `-f`, and that is the load-bearing detail. The obvious route --
`getContainer(...).logs()` and drain the stream to `'end'` -- FOLLOWS a running container, so
`'end'` never arrives; awaiting it leaves the process with a pending promise, and a pending
promise under the driver's top-level `await` ends the run with `Detected unsettled top-level
await` and exit 13, taking the failure report with it. That was measured twice, and bounding the
drain with a timer only traded one hang for another. A command that terminates by itself removes
the condition instead of racing it.

Must be called BEFORE [shutdown](#shutdown), which removes the containers and their logs with them.
Never throws: it runs on a failure path, where losing the original error to a logging problem
would be the worse outcome. A service whose log cannot be read is reported by its absence from
the returned list.

#### Parameters

##### directory

`string`

The directory the log files are written into; created if absent.

#### Returns

`Promise`\<`string`[]\>

The paths written, one per service whose log could be read.

***

### enactFork()

> **enactFork**(): `Promise`\<[`ForkEnactment`](../interfaces/ForkEnactment.md)\>

Enacts the ledger-8 to ledger-9 fork on the running chain and waits for it to finalize past the
applying block. From here on [ForkTestEnvironment.getEnvironmentConfiguration](#getenvironmentconfiguration) reports the
post-fork proof server.

The toolkit runs through `docker compose run` rather than as a testcontainer so that it joins
the project network and reaches the node under its service name.

#### Returns

`Promise`\<[`ForkEnactment`](../interfaces/ForkEnactment.md)\>

The spec versions either side of the boundary and the applying height.

#### Throws

If the fork has already been enacted on this chain.

#### Throws

If the governance call fails, or if no finalized block reports a higher spec version in time.

#### Throws

If the chain does not reach or finalize past the applying block in time.

***

### getEnvironmentConfiguration()

> **getEnvironmentConfiguration**(): [`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

The current environment configuration. Its `proofServer` names the pre-fork server until
[ForkTestEnvironment.enactFork](#enactfork) runs and the post-fork one afterwards; every other field
is fixed for the life of the stack.

#### Returns

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

The configuration for the side of the boundary the chain is on.

#### Throws

If the environment has not been started, or has already been shut down.

#### Overrides

[`TestEnvironment`](TestEnvironment.md).[`getEnvironmentConfiguration`](TestEnvironment.md#getenvironmentconfiguration)

***

### getMidnightWalletProvider()

> **getMidnightWalletProvider**(): `Promise`\<[`MidnightWalletProvider`](MidnightWalletProvider.md)\>

Starts a single wallet instance.

#### Returns

`Promise`\<[`MidnightWalletProvider`](MidnightWalletProvider.md)\>

A promise that resolves to the started wallet

#### Throws

If no wallet could be started

#### Inherited from

[`TestEnvironment`](TestEnvironment.md).[`getMidnightWalletProvider`](TestEnvironment.md#getmidnightwalletprovider)

***

### getPostForkProofServer()

> **getPostForkProofServer**(): `string`

The proof server that proves transactions built above the boundary.

#### Returns

`string`

The post-fork (ledger-9) proof server's URL.

***

### getPreForkProofServer()

> **getPreForkProofServer**(): `string`

The proof server that proves transactions built below the boundary.

#### Returns

`string`

The pre-fork (ledger-8) proof server's URL.

***

### runToolkit()

> **runToolkit**(`args`): `Promise`\<`string`\>

Runs one node-toolkit command against this stack and returns its combined output.

Through `compose run` rather than as a testcontainer, so it joins the project
network and reaches the node under its service name. Exposed because a caller
may need the NODE's own answer about the chain: the indexer serves the latest
contract action at or before a block, so on questions about migrated state
the two sources can legitimately differ and the difference is the finding.

#### Parameters

##### args

readonly `string`[]

The toolkit subcommand and its arguments.

#### Returns

`Promise`\<`string`\>

stdout and stderr, concatenated.

#### Throws

Error, with the toolkit's stderr on `cause`, if the command fails.

***

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Shuts down the test environment and cleans up resources.

#### Returns

`Promise`\<`void`\>

A promise that resolves when shutdown is complete

#### Overrides

[`TestEnvironment`](TestEnvironment.md).[`shutdown`](TestEnvironment.md#shutdown)

***

### specVersionAtFinalizedHead()

> **specVersionAtFinalizedHead**(): `Promise`\<`number`\>

The runtime spec version at the chain's finalized head, read from the node rather than from any
state this class holds. Lets a caller check the era against the chain itself.

#### Returns

`Promise`\<`number`\>

The spec version in force at the finalized head.

***

### start()

> **start**(`maybeProofServerContainer?`): `Promise`\<[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)\>

Starts the fork stack and returns its configuration on the pre-fork side of the boundary.

#### Parameters

##### maybeProofServerContainer?

[`ProofServerContainer`](../interfaces/ProofServerContainer.md)

Must be nullish; present only to satisfy the base-class signature.

#### Returns

`Promise`\<[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)\>

The pre-fork environment configuration.

#### Throws

If a proof server container is injected, since neither of this stack's two can be replaced.

#### Throws

If the stack has already been started, since a second start would orphan the first.

#### Overrides

[`TestEnvironment`](TestEnvironment.md).[`start`](TestEnvironment.md#start)

***

### startMidnightWalletProviders()

> **startMidnightWalletProviders**(): `Promise`\<[`MidnightWalletProvider`](MidnightWalletProvider.md)[]\>

Not supported on this stack. A wallet cannot sync a chain whose history spans the boundary, so
there is nothing here for a wallet-driven test to build on and refusing beats handing back a
provider that cannot see its own funds.

#### Returns

`Promise`\<[`MidnightWalletProvider`](MidnightWalletProvider.md)[]\>

Never resolves.

#### Throws

Always.

#### Overrides

[`TestEnvironment`](TestEnvironment.md).[`startMidnightWalletProviders`](TestEnvironment.md#startmidnightwalletproviders)
