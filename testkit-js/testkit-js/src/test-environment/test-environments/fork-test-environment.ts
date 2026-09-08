/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NetworkId } from '@midnightntwrk/wallet-sdk';
import type { Logger } from 'pino';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment, Wait } from 'testcontainers';

import { getContainersConfiguration } from '../../configuration';
import type { ProofServerContainer } from '../../proof-server-container';
import { delay, MINUTE } from '../../utils';
import type { MidnightWalletProvider } from '../../wallet';
import type { EnvironmentConfiguration } from '..';
import { TestEnvironment } from './test-environment';

const execFileAsync = promisify(execFile);

const FORK_COMPOSE_FILE = 'compose-fork.yml';

/** The runtime blob the `runtime-blob` service lifts out of the new node image, as the toolkit sees it. */
const RUNTIME_WASM_PATH = '/runtime/midnight_node_runtime.compact.compressed.wasm';

/**
 * Image tags the lane may be pointed at, so a workflow input reaches compose unchanged. Every one
 * has a default in `compose-fork.yml`; only variables set to a non-empty value are forwarded, so an
 * unset (or blanked) variable keeps the pinned default rather than resolving to an empty tag.
 */
const IMAGE_TAG_VARIABLES = [
  'FORK_FROM_NODE_TAG',
  'NODE_TAG',
  'TOOLKIT_TAG',
  'INDEXER_TAG',
  'PROOF_SERVER_TAG',
  'PROOF_SERVER_V8_TAG'
] as const;

const NODE_PORT = 9944;
const INDEXER_PORT = 8088;
const PROOF_SERVER_PORT = 6300;

/** The node's address on the compose project network, which is how the toolkit container reaches it. */
const NODE_INTERNAL_WS_URL = `ws://node:${NODE_PORT}`;

/**
 * Deadlines, each a ceiling on one step rather than a target.
 *
 * `enactFork` runs four of them back to back, so its worst case is
 * `FIRST_BLOCK_FINALIZATION + TOOLKIT + RUNTIME_APPLIED + POST_FORK_FINALIZATION` = 12 minutes. A
 * caller's own test timeout has to exceed that, or the inner deadline that would have named the
 * failure never fires and the run reports a bare timeout instead.
 */
const SERVICE_STARTUP_TIMEOUT = 5 * MINUTE;
const FIRST_BLOCK_FINALIZATION_TIMEOUT = 2 * MINUTE;
const TOOLKIT_TIMEOUT = 5 * MINUTE;
const RUNTIME_APPLIED_TIMEOUT = 3 * MINUTE;
const POST_FORK_FINALIZATION_TIMEOUT = 2 * MINUTE;
const CHAIN_POLL_INTERVAL = 3_000;
const STACK_SHUTDOWN_TIMEOUT = 30_000;

/** A single RPC round trip's ceiling, so a node that accepts a connection and never answers cannot outlive a poll deadline. */
const RPC_TIMEOUT = 10_000;

const TOOLKIT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

/**
 * The governance seeds the dev preset's council and technical committee are built from. These are
 * the public Substrate development URIs, i.e. well-known constants rather than secrets.
 */
const COUNCIL_SEEDS = ['//Dave', '//Eve'] as const;
const TECHNICAL_COMMITTEE_SEEDS = ['//Alice', '//Bob'] as const;
const SIGNER_SEED = '//Alice';

export interface ForkEnactment {
  /** The runtime spec version at block #1, i.e. the one genesis brought up. */
  readonly oldSpecVersion: number;
  /**
   * The runtime spec version reported from the applying block's state onwards. Guaranteed to be
   * greater than {@link ForkEnactment.oldSpecVersion}.
   */
  readonly newSpecVersion: number;
  /** The height of the block that applied the new code; the new runtime first executes at `appliedAt + 1`. */
  readonly appliedAtBlockHeight: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * One JSON-RPC round trip, returning the `result` member unexamined.
 *
 * The shape checks are guards rather than casts, so a malformed answer surfaces here under the
 * method that produced it.
 */
const rpc = async (url: string, method: string, params: readonly unknown[] = []): Promise<unknown> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT)
  });
  if (!response.ok) {
    throw new Error(`${method} -> HTTP ${response.status} ${response.statusText}`);
  }
  const payload: unknown = await response.json();
  if (!isRecord(payload)) {
    throw new Error(`${method} -> response was not a JSON object`);
  }
  if (payload.error !== undefined) {
    throw new Error(`${method} -> ${JSON.stringify(payload.error)}`);
  }
  if (payload.result === undefined) {
    throw new Error(`${method} -> response carried neither a result nor an error`);
  }
  return payload.result;
};

const rpcString = async (url: string, method: string, params: readonly unknown[] = []): Promise<string> => {
  const result = await rpc(url, method, params);
  if (typeof result !== 'string') {
    throw new Error(`${method} -> expected a string result, got ${typeof result}`);
  }
  return result;
};

const specVersionAtHeight = async (url: string, height: number): Promise<number> => {
  const blockHash = await rpcString(url, 'chain_getBlockHash', [height]);
  const result = await rpc(url, 'state_getRuntimeVersion', [blockHash]);
  if (!isRecord(result) || typeof result.specVersion !== 'number') {
    throw new Error('state_getRuntimeVersion -> result carried no numeric specVersion');
  }
  return result.specVersion;
};

const finalizedHeight = async (url: string): Promise<number> => {
  const header = await rpc(url, 'chain_getHeader', [await rpcString(url, 'chain_getFinalizedHead')]);
  if (!isRecord(header) || typeof header.number !== 'string') {
    throw new Error('chain_getHeader -> result carried no header number');
  }
  const height = Number(header.number);
  if (!Number.isFinite(height)) {
    throw new Error(`chain_getHeader -> header number ${header.number} is not a number`);
  }
  return height;
};

/**
 * Waits until the chain has finalized `height`.
 *
 * A failed read is retried rather than fatal, because the node's RPC is not always up on the first
 * iterations. The last failure is carried onto the deadline error as its `cause`, so a node that
 * never answered is distinguishable from one that answered slowly -- reporting the latter's height
 * for the former would name the wrong problem.
 */
const waitForFinalized = async (url: string, height: number, deadline: number): Promise<void> => {
  let lastError: unknown;
  let lastHeight: number | undefined;
  for (;;) {
    try {
      lastHeight = await finalizedHeight(url);
      lastError = undefined;
      if (lastHeight >= height) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      const observed = lastHeight === undefined ? 'the node never answered' : `the chain last reported #${lastHeight}`;
      throw new Error(`Timed out waiting for finalized block #${height}; ${observed}`, { cause: lastError });
    }
    await delay(CHAIN_POLL_INTERVAL);
  }
};

/**
 * Waits until a finalized block reports a spec version above `oldSpecVersion`, and answers with that
 * height.
 *
 * The toolkit's `runtime-upgrade` returns once governance has been *submitted*: `set_code` takes
 * effect a block later and finality lags further still. Reading the head straight after it returns
 * therefore finds no applying block yet, which is a timing condition rather than a failed upgrade.
 * Polling here is what separates the two, so the deadline error can say which one happened.
 */
const waitForRuntimeApplied = async (url: string, oldSpecVersion: number, deadline: number): Promise<number> => {
  let lastError: unknown;
  let lastHeight: number | undefined;
  let lastSpecVersion: number | undefined;
  for (;;) {
    try {
      lastHeight = await finalizedHeight(url);
      lastSpecVersion = await specVersionAtHeight(url, lastHeight);
      lastError = undefined;
      if (lastSpecVersion > oldSpecVersion) {
        return lastHeight;
      }
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      const observed =
        lastSpecVersion === undefined
          ? 'the node never reported a spec version'
          : `spec is still ${lastSpecVersion} at finalized head #${String(lastHeight)}`;
      throw new Error(
        `The runtime upgrade never applied: ${observed}. Either the governance motion did not reach ` +
          `threshold or the submitted wasm was rejected.`,
        { cause: lastError }
      );
    }
    await delay(CHAIN_POLL_INTERVAL);
  }
};

/**
 * The first height in `[lo, hi]` whose spec version is above `oldSpecVersion` -- the block that
 * applied the new code.
 *
 * `specVersion` only moves up along the chain, so this is a bisection rather than a scan. It
 * requires `spec(hi) > oldSpecVersion`, which callers get from {@link waitForRuntimeApplied};
 * without it the search converges on `hi` and would report the head as the applying block.
 */
const findApplyingBlock = async (url: string, oldSpecVersion: number, lo: number, hi: number): Promise<number> => {
  let low = lo;
  let high = hi;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const spec = await specVersionAtHeight(url, mid);
    if (spec > oldSpecVersion) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};

const imageTagOverrides = (): Record<string, string> => {
  const overrides: Record<string, string> = {};
  for (const name of IMAGE_TAG_VARIABLES) {
    const value = process.env[name];
    if (value !== undefined && value !== '') {
      overrides[name] = value;
    }
  }
  return overrides;
};

/** `execFile` appends the child's stderr to the error message but drops stdout, which is where the toolkit reports governance progress. */
const describeExecFailure = (error: unknown): string => {
  if (!isRecord(error)) {
    return String(error);
  }
  const sections = [`code=${String(error.code)} signal=${String(error.signal)}`];
  if (typeof error.stdout === 'string' && error.stdout !== '') {
    sections.push(`--- toolkit stdout ---\n${error.stdout}`);
  }
  if (typeof error.stderr === 'string' && error.stderr !== '') {
    sections.push(`--- toolkit stderr ---\n${error.stderr}`);
  }
  return sections.join('\n');
};

/**
 * Names the failure the toolkit actually hit. A killed process is our doing, not a rejected
 * governance motion, and reporting it as one sends the reader after the wrong bug.
 */
const toolkitFailureMessage = (error: unknown): string => {
  if (isRecord(error) && error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return `The toolkit produced more than ${TOOLKIT_MAX_OUTPUT_BYTES} bytes of output and was killed; the runtime-upgrade may or may not have been submitted`;
  }
  if (isRecord(error) && error.killed === true) {
    return `The toolkit did not finish within ${TOOLKIT_TIMEOUT}ms and was killed; the runtime-upgrade may or may not have been submitted`;
  }
  return `The toolkit's runtime-upgrade failed`;
};

/**
 * Configuration of the fork stack for a given side of the boundary.
 *
 * The only field that moves across the fork is `proofServer`: the stack runs one proof server per
 * era because no published image serves both. That split is a property of this harness, not the
 * topology the product assumes -- see `docs/architecture/fork-e2e-environment.md`.
 */
class ForkTestConfiguration implements EnvironmentConfiguration {
  readonly walletNetworkId: NetworkId.NetworkId;
  readonly networkId: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly nodeWS: string;
  readonly proofServer: string;
  readonly faucet: string | undefined;

  constructor(ports: { indexer: number; node: number }, proofServerUrl: string) {
    this.walletNetworkId = NetworkId.NetworkId.Undeployed;
    this.networkId = 'undeployed';
    this.indexer = `http://127.0.0.1:${ports.indexer}/api/v4/graphql`;
    this.indexerWS = `ws://127.0.0.1:${ports.indexer}/api/v4/graphql/ws`;
    this.node = `http://127.0.0.1:${ports.node}`;
    this.nodeWS = `ws://127.0.0.1:${ports.node}`;
    this.proofServer = proofServerUrl;
    this.faucet = undefined;
  }
}

/**
 * A chain whose genesis carries the ledger-v8 runtime, running on the ledger-v9 node binary, plus
 * the governance call that moves it across the boundary.
 *
 * A test that wants the fork constructs this class directly -- `getTestEnvironment` never returns
 * it. Why it is a sibling of the other environments rather than a mode of one, and why it runs two
 * proof servers, is recorded in `docs/architecture/fork-e2e-environment.md`.
 *
 * Wallets are not supported here; {@link ForkTestEnvironment.startMidnightWalletProviders} refuses.
 *
 * @example
 * ```ts
 * const environment = new ForkTestEnvironment(logger);
 * const preFork = await environment.start();          // chain is on the ledger-v8 runtime
 * const { appliedAtBlockHeight } = await environment.enactFork(); // governance set_code, finalized past
 * const postFork = environment.getEnvironmentConfiguration(); // now points at the v9 proof server
 * ```
 */
export class ForkTestEnvironment extends TestEnvironment {
  private dockerEnv: StartedDockerComposeEnvironment | undefined;
  private environmentConfiguration: EnvironmentConfiguration | undefined;
  private forkEnactment: ForkEnactment | undefined;
  private readonly composeDirectory: string;
  private readonly composeFile: string;
  private readonly projectName: string;
  private readonly composeEnvironment: Record<string, string>;

  constructor(logger: Logger) {
    super(logger);
    this.composeDirectory = getContainersConfiguration().standalone.path;
    this.composeFile = path.join(this.composeDirectory, FORK_COMPOSE_FILE);
    this.projectName = `fork-${randomUUID()}`;
    this.composeEnvironment = { TESTCONTAINERS_UID: this.uid, ...imageTagOverrides() };
  }

  /**
   * The compose project this stack runs under.
   *
   * Exposed so a caller can drive the same project itself -- `compose run
   * --profile tools toolkit ...` for a node-side reading, say -- and reach the
   * node under its service name rather than through a mapped port.
   */
  get composeProject(): string {
    return this.projectName;
  }

  /** Whether {@link ForkTestEnvironment.enactFork} has already moved this chain across the boundary. */
  get hasForked(): boolean {
    return this.forkEnactment !== undefined;
  }

  /**
   * The current environment configuration. Its `proofServer` names the pre-fork server until
   * {@link ForkTestEnvironment.enactFork} runs and the post-fork one afterwards; every other field
   * is fixed for the life of the stack.
   *
   * @returns {EnvironmentConfiguration} The configuration for the side of the boundary the chain is on.
   * @throws {Error} If the environment has not been started, or has already been shut down.
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    if (this.environmentConfiguration === undefined) {
      throw new Error('Fork test environment has not been started; call start() first');
    }
    return this.environmentConfiguration;
  }

  /**
   * The proof server that proves transactions built below the boundary.
   *
   * @returns {string} The pre-fork (ledger-8) proof server's URL.
   */
  getPreForkProofServer(): string {
    return `http://127.0.0.1:${this.mappedPort('proof-server-v8', PROOF_SERVER_PORT)}`;
  }

  /**
   * The proof server that proves transactions built above the boundary.
   *
   * @returns {string} The post-fork (ledger-9) proof server's URL.
   */
  getPostForkProofServer(): string {
    return `http://127.0.0.1:${this.mappedPort('proof-server', PROOF_SERVER_PORT)}`;
  }

  /**
   * The runtime spec version at the chain's finalized head, read from the node rather than from any
   * state this class holds. Lets a caller check the era against the chain itself.
   *
   * @returns {Promise<number>} The spec version in force at the finalized head.
   */
  async specVersionAtFinalizedHead(): Promise<number> {
    const url = this.getNodeHttpUrl();
    return specVersionAtHeight(url, await finalizedHeight(url));
  }

  /**
   * Starts the fork stack and returns its configuration on the pre-fork side of the boundary.
   *
   * @param {ProofServerContainer} maybeProofServerContainer - Must be nullish; present only to satisfy the base-class signature.
   * @returns {Promise<EnvironmentConfiguration>} The pre-fork environment configuration.
   * @throws {Error} If a proof server container is injected, since neither of this stack's two can be replaced.
   * @throws {Error} If the stack has already been started, since a second start would orphan the first.
   */
  start = async (maybeProofServerContainer?: ProofServerContainer): Promise<EnvironmentConfiguration> => {
    if (maybeProofServerContainer !== undefined && maybeProofServerContainer !== null) {
      throw new Error(
        'Invalid usage: the fork test environment runs one proof server per era and cannot take an injected one'
      );
    }
    if (this.dockerEnv !== undefined) {
      throw new Error('Fork test environment is already started; construct a second instance for a second chain');
    }
    this.logger.info(`Starting fork test environment... project=${this.projectName}, uid=${this.uid}`);
    // The resolved tags are the load-bearing fact about a version-boundary test, and a mistyped
    // variable name is otherwise indistinguishable from an unset one -- both leave the default.
    this.logger.info(
      `Fork stack image tags: ${IMAGE_TAG_VARIABLES.map(
        (name) => `${name}=${this.composeEnvironment[name] ?? '<compose default>'}`
      ).join(' ')}`
    );
    this.dockerEnv = await new DockerComposeEnvironment(this.composeDirectory, FORK_COMPOSE_FILE)
      // Named so `enactFork`'s `compose run` targets this same project, and so a leftover stack is
      // identifiable rather than anonymous.
      .withProjectName(this.projectName)
      .withEnvironment(this.composeEnvironment)
      // No wait strategy for `chainspec` or `runtime-blob`: they have exited by the time `up()`
      // returns, so testcontainers never matches them and warns about the unused strategy instead.
      // `depends_on: service_completed_successfully` in the compose file is what orders them.
      .withWaitStrategy(`node_${this.uid}`, Wait.forHealthCheck().withStartupTimeout(SERVICE_STARTUP_TIMEOUT))
      // Probed from the host over the mapped port rather than in-container, because a listening port
      // alone does not mean the API is serving.
      .withWaitStrategy(
        `indexer_${this.uid}`,
        Wait.forHttp('/ready', INDEXER_PORT).withStartupTimeout(SERVICE_STARTUP_TIMEOUT)
      )
      .withWaitStrategy(
        `proof-server_${this.uid}`,
        Wait.forListeningPorts().withStartupTimeout(SERVICE_STARTUP_TIMEOUT)
      )
      .withWaitStrategy(
        `proof-server-v8_${this.uid}`,
        Wait.forListeningPorts().withStartupTimeout(SERVICE_STARTUP_TIMEOUT)
      )
      // Deliberately no environment-level `withStartupTimeout`: testcontainers applies it to every
      // selected strategy, overwriting the per-service values above.
      .up();

    setNetworkId('undeployed');
    this.environmentConfiguration = this.configurationFor(this.getPreForkProofServer());
    this.logger.info(`Fork test environment configuration: ${JSON.stringify(this.environmentConfiguration)}`);
    return this.environmentConfiguration;
  };

  /**
   * Enacts the ledger-8 to ledger-9 fork on the running chain and waits for it to finalize past the
   * applying block. From here on {@link ForkTestEnvironment.getEnvironmentConfiguration} reports the
   * post-fork proof server.
   *
   * The toolkit runs through `docker compose run` rather than as a testcontainer so that it joins
   * the project network and reaches the node under its service name.
   *
   * @returns {Promise<ForkEnactment>} The spec versions either side of the boundary and the applying height.
   * @throws {Error} If the fork has already been enacted on this chain.
   * @throws {Error} If the governance call fails, or if no finalized block reports a higher spec version in time.
   * @throws {Error} If the chain does not reach or finalize past the applying block in time.
   */
  enactFork = async (): Promise<ForkEnactment> => {
    if (this.forkEnactment !== undefined) {
      throw new Error('The fork has already been enacted on this chain');
    }
    const url = this.getNodeHttpUrl();

    await waitForFinalized(url, 1, Date.now() + FIRST_BLOCK_FINALIZATION_TIMEOUT);
    const oldSpecVersion = await specVersionAtHeight(url, 1);
    this.logger.info(`spec_version at #1: ${oldSpecVersion}`);

    await this.runToolkitUpgrade();

    const appliedHead = await waitForRuntimeApplied(url, oldSpecVersion, Date.now() + RUNTIME_APPLIED_TIMEOUT);
    const appliedAtBlockHeight = await findApplyingBlock(url, oldSpecVersion, 1, appliedHead);
    const newSpecVersion = await specVersionAtHeight(url, appliedAtBlockHeight);
    this.logger.info(`New runtime applied at #${appliedAtBlockHeight} (spec ${oldSpecVersion} -> ${newSpecVersion})`);

    await waitForFinalized(url, appliedAtBlockHeight + 1, Date.now() + POST_FORK_FINALIZATION_TIMEOUT);

    this.forkEnactment = { oldSpecVersion, newSpecVersion, appliedAtBlockHeight };
    this.environmentConfiguration = this.configurationFor(this.getPostForkProofServer());
    return this.forkEnactment;
  };

  /**
   * Not supported on this stack. A wallet cannot sync a chain whose history spans the boundary, so
   * there is nothing here for a wallet-driven test to build on and refusing beats handing back a
   * provider that cannot see its own funds.
   *
   * @returns {Promise<MidnightWalletProvider[]>} Never resolves.
   * @throws {Error} Always.
   */
  startMidnightWalletProviders = (): Promise<MidnightWalletProvider[]> => {
    throw new Error(
      'Wallets are not supported on the fork test environment; use LocalTestEnvironment for wallet-driven tests'
    );
  };

  /**
   * Tears the stack down, volumes included, and forgets the configuration it was reporting.
   *
   * @returns {Promise<void>} Resolves once the stack is down.
   */
  shutdown = async (): Promise<void> => {
    this.logger.info('Shutting down fork test environment...');
    // Cleared before the await so a failing `down()` cannot leave this instance reporting URLs for
    // containers that are on their way out.
    this.environmentConfiguration = undefined;
    this.forkEnactment = undefined;
    const dockerEnv = this.dockerEnv;
    this.dockerEnv = undefined;
    if (dockerEnv) {
      await dockerEnv.down({ timeout: STACK_SHUTDOWN_TIMEOUT, removeVolumes: true });
    }
  };

  /** The node's JSON-RPC endpoint over HTTP, which is how this environment reads the chain. */
  private getNodeHttpUrl(): string {
    return `http://127.0.0.1:${this.mappedPort('node', NODE_PORT)}`;
  }

  private configurationFor(proofServerUrl: string): EnvironmentConfiguration {
    return new ForkTestConfiguration(
      { indexer: this.mappedPort('indexer', INDEXER_PORT), node: this.mappedPort('node', NODE_PORT) },
      proofServerUrl
    );
  }

  private mappedPort(service: string, port: number): number {
    if (this.dockerEnv === undefined) {
      throw new Error('Fork test environment has not been started; call start() first');
    }
    return this.dockerEnv.getContainer(`${service}_${this.uid}`).getMappedPort(port);
  }

  /**
   * Runs one node-toolkit command against this stack and returns its combined output.
   *
   * Through `compose run` rather than as a testcontainer, so it joins the project
   * network and reaches the node under its service name. Exposed because a caller
   * may need the NODE's own answer about the chain: the indexer serves the latest
   * contract action at or before a block, so on questions about migrated state
   * the two sources can legitimately differ and the difference is the finding.
   *
   * @param args The toolkit subcommand and its arguments.
   * @returns stdout and stderr, concatenated.
   * @throws Error, with the toolkit's stderr on `cause`, if the command fails.
   */
  runToolkit = async (args: readonly string[]): Promise<string> => {
    const composeArgs = [
      'compose',
      '-f',
      this.composeFile,
      '-p',
      this.projectName,
      '--profile',
      'tools',
      'run',
      '--rm',
      'toolkit',
      ...args
    ];
    try {
      const { stdout, stderr } = await execFileAsync('docker', composeArgs, {
        env: { ...process.env, ...this.composeEnvironment },
        maxBuffer: 32 * 1024 * 1024
      });
      return `${stdout}\n${stderr}`;
    } catch (cause) {
      throw new Error(`The node toolkit command ${args.join(' ')} failed`, { cause });
    }
  };

  private async runToolkitUpgrade(): Promise<void> {
    const composeArgs = [
      'compose',
      '-f',
      this.composeFile,
      '-p',
      this.projectName,
      '--profile',
      'tools',
      'run',
      '--rm',
      'toolkit'
    ];
    const upgradeArgs = [
      'runtime-upgrade',
      '--wasm-file',
      RUNTIME_WASM_PATH,
      ...COUNCIL_SEEDS.flatMap((seed) => ['-c', seed]),
      ...TECHNICAL_COMMITTEE_SEEDS.flatMap((seed) => ['-t', seed]),
      '--rpc-url',
      NODE_INTERNAL_WS_URL,
      '--signer-key',
      SIGNER_SEED
    ];
    this.logger.info('Enacting the fork (governance set_code) through the node toolkit...');
    try {
      const { stdout } = await execFileAsync('docker', [...composeArgs, ...upgradeArgs], {
        env: { ...process.env, ...this.composeEnvironment },
        maxBuffer: TOOLKIT_MAX_OUTPUT_BYTES,
        timeout: TOOLKIT_TIMEOUT
      });
      // "submitted", not "enacted": a zero exit means the CLI drove governance to completion, not
      // that the new code is in force. `enactFork` proves that separately, against the chain.
      this.logger.info(`Toolkit runtime-upgrade exited 0 (submitted, not yet enacted):\n${stdout}`);
    } catch (error) {
      this.logger.error(`The toolkit's runtime-upgrade failed.\n${describeExecFailure(error)}`);
      throw new Error(toolkitFailureMessage(error), { cause: error });
    }
  }
}
