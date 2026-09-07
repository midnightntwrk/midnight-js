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
import { MidnightWalletProvider } from '../../wallet';
import type { EnvironmentConfiguration } from '..';
import { TestEnvironment } from './test-environment';

const execFileAsync = promisify(execFile);

/** The compose file describing the fork stack, resolved beside `compose.yml`. */
const FORK_COMPOSE_FILE = 'compose-fork.yml';

/** The runtime blob the `runtime-blob` service lifts out of the new node image, as the toolkit sees it. */
const RUNTIME_WASM_PATH = '/runtime/midnight_node_runtime.compact.compressed.wasm';

/**
 * Image tags the lane may be pointed at, so a workflow input reaches compose unchanged. Every one
 * has a default in `compose-fork.yml`; only those actually set in the environment are forwarded, so
 * an unset variable keeps the pinned default rather than blanking the tag.
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

/**
 * The governance seeds the dev preset's council and technical committee are built from. These are
 * the public Substrate development URIs, i.e. well-known constants rather than secrets.
 */
const COUNCIL_SEEDS = ['//Dave', '//Eve'] as const;
const TECHNICAL_COMMITTEE_SEEDS = ['//Alice', '//Bob'] as const;
const SIGNER_SEED = '//Alice';

/** What the fork turned out to be, once enacted and finalized past. */
export interface ForkEnactment {
  /** The runtime spec version genesis was carrying. */
  readonly oldSpecVersion: number;
  /** The runtime spec version in force from the applying block onwards. */
  readonly newSpecVersion: number;
  /** The height of the block that applied the new code. */
  readonly appliedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * One JSON-RPC round trip, returning the `result` member unexamined.
 *
 * Every shape check below is a guard rather than a cast: the node is outside the trust boundary, so
 * a malformed answer has to surface as a named failure here instead of as a confusing one later.
 */
const rpc = async (url: string, method: string, params: readonly unknown[] = []): Promise<unknown> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params })
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

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const blockHashAt = (url: string, height: number): Promise<string> => rpcString(url, 'chain_getBlockHash', [height]);

const specVersionAt = async (url: string, blockHash?: string): Promise<number> => {
  const result = await rpc(url, 'state_getRuntimeVersion', blockHash === undefined ? [] : [blockHash]);
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

const waitForFinalized = async (url: string, height: number, deadline: number): Promise<number> => {
  for (;;) {
    const current = await finalizedHeight(url).catch(() => 0);
    if (current >= height) {
      return current;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for finalized block #${height}; the chain is at #${current}`);
    }
    await sleep(3_000);
  }
};

/**
 * The first height reporting a spec version above `oldSpecVersion` -- the block that applied the new
 * code. `specVersion` is monotonic along the chain, so this is a bisection rather than a scan.
 */
const findApplyingBlock = async (url: string, oldSpecVersion: number, lo: number, hi: number): Promise<number> => {
  let low = lo;
  let high = hi;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const spec = await specVersionAt(url, await blockHashAt(url, mid));
    if (spec > oldSpecVersion) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};

const imageTagOverrides = (): Record<string, string> =>
  IMAGE_TAG_VARIABLES.reduce<Record<string, string>>((collected, name) => {
    const value = process.env[name];
    if (value === undefined || value === '') {
      return collected;
    }
    return { ...collected, [name]: value };
  }, {});

/**
 * Configuration of the fork stack for a given side of the boundary.
 *
 * The only field that moves across the fork is `proofServer`: the stack runs one proof server per
 * era because no published image serves both. That split is a harness stand-in for the single
 * fork-prepared endpoint the product assumes (spec OQ16) -- do not read it as the shipped topology.
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
 * This is deliberately a sibling of {@link LocalTestEnvironment} rather than a mode of it, and it is
 * deliberately absent from `getTestEnvironment`'s switch: the stack is a different compose file with
 * one-shot services and two proof servers, and a suite-wide run has no business landing on it by
 * accident. A test that wants the fork constructs this class directly.
 *
 * @example
 * ```ts
 * const environment = new ForkTestEnvironment(logger);
 * const preFork = await environment.start();          // chain is on the ledger-v8 runtime
 * const { appliedAt } = await environment.enactFork(); // governance set_code, finalized past
 * const postFork = environment.getEnvironmentConfiguration(); // now points at the v9 proof server
 * ```
 */
export class ForkTestEnvironment extends TestEnvironment {
  static readonly MAX_NUMBER_OF_WALLETS = 4;

  readonly genesisMintWalletSeed = [
    '0000000000000000000000000000000000000000000000000000000000000002',
    '0000000000000000000000000000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000000000000000000000000000003',
    '0000000000000000000000000000000000000000000000000000000000000004'
  ];

  private dockerEnv: StartedDockerComposeEnvironment | undefined;
  private environmentConfiguration: EnvironmentConfiguration | undefined;
  private walletProviders: MidnightWalletProvider[] = [];
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

  /** Whether {@link enactFork} has already moved this chain across the boundary. */
  get hasForked(): boolean {
    return this.forkEnactment !== undefined;
  }

  /**
   * The proof server for the era the chain is currently in.
   *
   * @returns {EnvironmentConfiguration} The configuration, with `proofServer` on the current era's server.
   * @throws {Error} If the environment has not been started.
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

  /** The node's JSON-RPC endpoint over HTTP, which is how this environment reads the chain. */
  getNodeHttpUrl(): string {
    return `http://127.0.0.1:${this.mappedPort('node', NODE_PORT)}`;
  }

  /**
   * The runtime spec version reported at the current best block.
   *
   * @returns {Promise<number>} The spec version at head.
   */
  specVersionAtHead(): Promise<number> {
    return specVersionAt(this.getNodeHttpUrl());
  }

  /**
   * Starts the fork stack and returns its configuration on the pre-fork side of the boundary.
   *
   * @param {ProofServerContainer} maybeProofServerContainer - Must be undefined; this stack owns both of its proof servers.
   * @returns {Promise<EnvironmentConfiguration>} The pre-fork environment configuration.
   * @throws {Error} If a proof server container is injected, since neither of this stack's two can be replaced.
   */
  start = async (maybeProofServerContainer?: ProofServerContainer): Promise<EnvironmentConfiguration> => {
    if (maybeProofServerContainer) {
      throw new Error(
        'Invalid usage: the fork test environment runs one proof server per era and cannot take an injected one'
      );
    }
    this.logger.info(`Starting fork test environment... project=${this.projectName}, uid=${this.uid}`);
    this.dockerEnv = await new DockerComposeEnvironment(this.composeDirectory, FORK_COMPOSE_FILE)
      // Named so `enactFork`'s `compose run` targets this same project, and so a leftover stack is
      // identifiable rather than anonymous.
      .withProjectName(this.projectName)
      .withEnvironment(this.composeEnvironment)
      .withWaitStrategy(`chainspec_${this.uid}`, Wait.forOneShotStartup())
      .withWaitStrategy(`runtime-blob_${this.uid}`, Wait.forOneShotStartup())
      .withWaitStrategy(`node_${this.uid}`, Wait.forHealthCheck().withStartupTimeout(5 * 60_000))
      // Probed from the host over the mapped port: the indexer image has no curl, so an in-container
      // healthcheck cannot answer this, and a listening port alone does not mean it is serving.
      .withWaitStrategy(`indexer_${this.uid}`, Wait.forHttp('/ready', INDEXER_PORT).withStartupTimeout(5 * 60_000))
      .withWaitStrategy(`proof-server_${this.uid}`, Wait.forListeningPorts().withStartupTimeout(5 * 60_000))
      .withWaitStrategy(`proof-server-v8_${this.uid}`, Wait.forListeningPorts().withStartupTimeout(5 * 60_000))
      .withStartupTimeout(10 * 60_000)
      .up();

    setNetworkId('undeployed');
    this.environmentConfiguration = this.configurationFor(this.getPreForkProofServer());
    this.logger.info(`Fork test environment configuration: ${JSON.stringify(this.environmentConfiguration)}`);
    return this.environmentConfiguration;
  };

  /**
   * Enacts the ledger-8 to ledger-9 fork on the running chain and waits for it to finalize past the
   * applying block. From here on {@link getEnvironmentConfiguration} reports the post-fork proof server.
   *
   * The toolkit runs through `docker compose run` rather than as a testcontainer so that it joins
   * the project network and reaches the node under its service name.
   *
   * @returns {Promise<ForkEnactment>} The spec versions either side of the boundary and the applying height.
   * @throws {Error} If the governance call fails, or if no block ever reports a higher spec version.
   */
  enactFork = async (): Promise<ForkEnactment> => {
    if (this.forkEnactment !== undefined) {
      throw new Error('The fork has already been enacted on this chain');
    }
    const url = this.getNodeHttpUrl();

    await waitForFinalized(url, 1, Date.now() + 180_000);
    const oldSpecVersion = await specVersionAt(url, await blockHashAt(url, 1));
    this.logger.info(`spec_version at #1: ${oldSpecVersion}`);

    await this.runToolkitUpgrade();

    const head = await finalizedHeight(url);
    const appliedAt = await findApplyingBlock(url, oldSpecVersion, 1, head);
    const newSpecVersion = await specVersionAt(url, await blockHashAt(url, appliedAt));
    if (newSpecVersion <= oldSpecVersion) {
      throw new Error(`No code-applying block found (spec ${oldSpecVersion}, finalized head #${head})`);
    }
    this.logger.info(`New runtime applied at #${appliedAt} (spec ${oldSpecVersion} -> ${newSpecVersion})`);

    await waitForFinalized(url, appliedAt + 1, Date.now() + 300_000);

    this.forkEnactment = { oldSpecVersion, newSpecVersion, appliedAt };
    this.environmentConfiguration = this.configurationFor(this.getPostForkProofServer());
    return this.forkEnactment;
  };

  /**
   * Creates and starts the specified number of wallet providers.
   *
   * @param {number} [amount] - How many wallets to start.
   * @param {string[]} [seeds] - Ignored; this stack funds the genesis mint wallets only.
   * @returns {Promise<MidnightWalletProvider[]>} The started wallet providers.
   * @throws {Error} If more wallets are requested than the genesis mint funds.
   */
  startMidnightWalletProviders = async (amount = 1, seeds?: string[]): Promise<MidnightWalletProvider[]> => {
    if (seeds) {
      this.logger.warn('Provided seeds will be ignored, using genesis mint wallet seeds');
    }
    if (amount > ForkTestEnvironment.MAX_NUMBER_OF_WALLETS) {
      throw new Error(
        `Maximum supported number of wallets for this environment reached: ${ForkTestEnvironment.MAX_NUMBER_OF_WALLETS}`
      );
    }
    const configuration = this.getEnvironmentConfiguration();
    this.walletProviders = await Promise.all(
      Array.from({ length: amount }).map((_element, index) =>
        MidnightWalletProvider.build(this.logger, configuration, this.genesisMintWalletSeed[index])
      )
    );
    await Promise.all(this.walletProviders.map((wallet) => wallet.start()));
    return this.walletProviders;
  };

  /**
   * Stops the wallets and tears the stack down, volumes included.
   *
   * @returns {Promise<void>} Resolves once the stack is down.
   */
  shutdown = async (): Promise<void> => {
    this.logger.info('Shutting down fork test environment...');
    await Promise.all(this.walletProviders.map((wallet) => wallet.stop()));
    this.walletProviders = [];
    if (this.dockerEnv) {
      await this.dockerEnv.down({ timeout: 30_000, removeVolumes: true });
      this.dockerEnv = undefined;
    }
  };

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

  private async runToolkitUpgrade(): Promise<void> {
    const args = [
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
      'runtime-upgrade',
      '--wasm-file',
      RUNTIME_WASM_PATH,
      ...COUNCIL_SEEDS.flatMap((seed) => ['-c', seed]),
      ...TECHNICAL_COMMITTEE_SEEDS.flatMap((seed) => ['-t', seed]),
      '--rpc-url',
      'ws://node:9944',
      '--signer-key',
      SIGNER_SEED
    ];
    this.logger.info('Enacting the fork (governance set_code) through the node toolkit...');
    try {
      const { stdout } = await execFileAsync('docker', args, {
        env: { ...process.env, ...this.composeEnvironment },
        maxBuffer: 32 * 1024 * 1024
      });
      this.logger.info(`Governance runtime-upgrade submitted: ${stdout.slice(-2000)}`);
    } catch (error) {
      throw new Error(`The toolkit's runtime-upgrade failed`, { cause: error });
    }
  }
}
