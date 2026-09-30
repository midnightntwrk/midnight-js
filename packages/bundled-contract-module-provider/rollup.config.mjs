import { createRollupConfig } from '../../build-tools/rollup.config.factory.mjs';
import packageJson from './package.json' with { type: 'json' };

export default createRollupConfig(packageJson);
