/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

module.exports = {
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles' },
    { type: 'refactor', section: 'Code Refactoring' },
    { type: 'perf', section: 'Performance Improvements' },
    { type: 'test', section: 'Tests' },
    { type: 'build', section: 'Build System' },
    { type: 'ci', section: 'Continuous Integration' },
    { type: 'chore', section: 'Improvements' },
    { type: 'revert', section: 'Reverts' }
  ],
  releaseCount: 0,
  commitUrlFormat: 'https://github.com/midnightntwrk/midnight-js/commit/{{hash}}',
  compareUrlFormat: 'https://github.com/midnightntwrk/midnight-js/compare/{{previousTag}}...{{currentTag}}',
  issueUrlFormat: 'https://github.com/midnightntwrk/midnight-js/pull/{{id}}',
  userUrlFormat: 'https://github.com/{{user}}',
  releaseCommitMessageFormat: 'chore(release): release {{currentTag}}',
  parserOpts: {
    noteKeywords: ['__NO_BREAKING_NOTES__']
  }
};
