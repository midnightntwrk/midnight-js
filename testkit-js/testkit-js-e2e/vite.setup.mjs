import { afterAll, beforeAll, vi } from 'vitest';
import {
  createLogger,
  tryDeleteDirectory,
  defaultContainersConfiguration,
  setContainersConfiguration
} from '@midnight-ntwrk/testkit-js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';

const logger = await createLogger('default.log');
globalThis.logger = logger;

const dir = path.resolve('./../');
const testKitContainersConfiguration = {
  ...defaultContainersConfiguration,
  standalone: {
    ...defaultContainersConfiguration.standalone,
    path: dir,
  },
  proofServer: {
    ...defaultContainersConfiguration.proofServer,
    path: dir
  }
};

beforeAll(async () => {
  logger.info(
    'Setting up container configuration to use pinned component versions'
  );
  setContainersConfiguration(testKitContainersConfiguration);
  await tryDeleteDirectory('../midnight-level-db');
});

const MINUTE = 60 * 1000;
let timeout = 3 * MINUTE;
const envVar = import.meta.env.MN_TEST_ENVIRONMENT;
const localNetEnvVarValues = [undefined, '', 'undeployed'];

// live environments take longer to sync wallet
if (!localNetEnvVarValues.includes(envVar)) {
  timeout = 10 * MINUTE;
}
vi.setConfig({ testTimeout: timeout });
logger.info(
  `Setting test timeout to ${timeout / MINUTE} minutes for MN_TEST_ENVIRONMENT='${envVar}'`
);

// TEMP DIAGNOSTIC (#1001): the events e2e shard intermittently passes its tests but the worker
// process never exits on amd64/CI, hanging to the 30-min job timeout. The lingering resource is
// below the JS-handle layer (libuv is empty, only stdio pipes remain), so it cannot be captured
// with why-is-node-running / getActiveResourcesInfo. This unref'd watchdog runs in the forks
// worker: it fires only if SOMETHING ELSE keeps the loop alive after teardown, dumps the full
// process report (libuv + nativeStack + loaded sharedObjects), and exits non-zero so the hang is
// reported fast instead of burning the job timeout. Disable with MN_EXIT_WATCHDOG_MS=0.
const WATCHDOG_MS = Number(process.env.MN_EXIT_WATCHDOG_MS ?? 30 * 1000);
let watchdogDumped = false;

const dumpAndExit = (reason) => {
  if (watchdogDumped) return;
  watchdogDumped = true;
  const testFile = process.env.MN_TEST_FILE ?? 'unknown';
  let report;
  try {
    report = process.report.getReport();
  } catch (error) {
    report = { reportError: String(error) };
  }
  const summary = {
    marker: 'EXIT_WATCHDOG_1001',
    reason,
    testFile,
    pid: process.pid,
    activeResources: process.getActiveResourcesInfo(),
    libuv: report.libuv,
    sharedObjects: report.sharedObjects,
    nativeStack: report.nativeStack
  };
  process.stderr.write('=== EXIT_WATCHDOG_1001 ===\n' + JSON.stringify(summary, null, 2) + '\n');
  try {
    fs.mkdirSync('./reports', { recursive: true });
    fs.writeFileSync(`./reports/exit-watchdog-${path.basename(testFile)}.json`, JSON.stringify(report, null, 2));
  } catch {
    /* best-effort artifact write */
  }
  process.exit(13);
};

// Primary capture: #1001 reports the worker's event loop is EMPTY yet the process won't exit, so an
// unref'd timer may never fire. The CI runner force-kills the hung worker at the job timeout — catch
// that signal and dump the below-JS state at the moment of the hang.
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => dumpAndExit(`received ${signal} while still alive`));
}

// Fast path: if instead a referenced handle keeps the loop alive, this unref'd timer fires shortly
// after teardown (zero cost on a clean exit, where the loop drains and the timer is discarded).
afterAll(() => {
  if (!Number.isFinite(WATCHDOG_MS) || WATCHDOG_MS <= 0) return;
  const timer = setTimeout(
    () => dumpAndExit(`worker still alive ${Math.round(WATCHDOG_MS / 1000)}s after tests completed`),
    WATCHDOG_MS
  );
  timer.unref();
});
