import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import configure from '../rollup.config.mjs';
import packageJson from './package.json' with { type: 'json' };

export default configure(
  dirname(fileURLToPath(import.meta.url)),
  packageJson,
  {
    // Ensure we keep the sub-folders as separate bundles.
    external: [
      /^@midnight-ntwrk\/compact-js\/(.*)$/
    ]
  }
);