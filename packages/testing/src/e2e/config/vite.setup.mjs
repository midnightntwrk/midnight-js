import { beforeAll, vi } from 'vitest';
import {
  createLogger,
  deleteDirectory,
  defaultContainersConfiguration,
  setContainersConfiguration
} from '@/infrastructure/index';

const logger = await createLogger('default.log');
globalThis.logger = logger;

beforeAll(async () => {
  logger.info(
    'Setting up container configuration to use pinned component versions'
  );
  setContainersConfiguration(defaultContainersConfiguration);
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
