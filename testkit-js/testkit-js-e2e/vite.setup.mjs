import { beforeAll, vi } from 'vitest';
import {
  createLogger,
  deleteDirectory,
  defaultContainersConfiguration,
  setContainersConfiguration
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

const logger = await createLogger('default.log');
globalThis.logger = logger;

const dir = path.resolve('./../');
const testKitContainersConfiguration = defaultContainersConfiguration;
testKitContainersConfiguration.standalone.path = dir;
testKitContainersConfiguration.proofServer.path = dir;

beforeAll(async () => {
  logger.info(
    'Setting up container configuration to use pinned component versions'
  );
  setContainersConfiguration(testKitContainersConfiguration);
  await deleteDirectory('../midnight-level-db');
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
