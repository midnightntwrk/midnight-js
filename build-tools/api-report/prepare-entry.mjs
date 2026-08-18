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

// Runs with the current working directory set to the package whose API report
// is being generated (via `yarn workspace <pkg> run api-report:prepare`).
//
// Rewrites `export * as name from 'module';` to the equivalent two-statement
// form `import * as name from 'module'; export { name };`. Both forms declare
// the same public API, but api-extractor cannot analyze the former when
// `module` resolves to an external package (see
// https://github.com/microsoft/rushstack/issues/2780), which is exactly the
// shape of the midnight-js barrel's re-exports. Rewriting a copy of the
// rolled-up declaration file keeps the actual shipped `dist/index.d.ts`
// untouched.

import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE_PATH = 'dist/index.d.ts';
const ENTRY_PATH = 'dist/api-report-entry.d.ts';

const NAMESPACE_REEXPORT_PATTERN = /^export \* as (\w+) from (.+);$/gm;

function rewriteNamespaceReexports(declarationSource) {
  return declarationSource.replace(
    NAMESPACE_REEXPORT_PATTERN,
    (_match, exportedName, moduleSpecifier) =>
      `import * as ${exportedName} from ${moduleSpecifier};\nexport { ${exportedName} };`,
  );
}

const declarationSource = readFileSync(SOURCE_PATH, 'utf8');
writeFileSync(ENTRY_PATH, rewriteNamespaceReexports(declarationSource));
