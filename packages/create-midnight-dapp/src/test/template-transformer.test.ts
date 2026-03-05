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

import { describe, expect, it } from 'vitest';

import { replaceVariables } from '../templates/template-transformer.js';

describe('template-transformer', () => {
  describe('replaceVariables', () => {
    it('replaces single variable', () => {
      const input = '{"name": "{{projectName}}"}';
      const result = replaceVariables(input, {
        projectName: 'my-app',
        midnightJsVersion: '1.0.0',
      });
      expect(result).toBe('{"name": "my-app"}');
    });

    it('replaces multiple variables', () => {
      const input = '{"name": "{{projectName}}", "version": "{{midnightJsVersion}}"}';
      const result = replaceVariables(input, {
        projectName: 'my-app',
        midnightJsVersion: '3.2.0-rc.3',
      });
      expect(result).toBe('{"name": "my-app", "version": "3.2.0-rc.3"}');
    });

    it('replaces same variable multiple times', () => {
      const input = '{{projectName}} is called {{projectName}}';
      const result = replaceVariables(input, {
        projectName: 'my-app',
        midnightJsVersion: '1.0.0',
      });
      expect(result).toBe('my-app is called my-app');
    });

    it('preserves content without variables', () => {
      const input = 'no variables here';
      const result = replaceVariables(input, {
        projectName: 'my-app',
        midnightJsVersion: '1.0.0',
      });
      expect(result).toBe('no variables here');
    });

    it('handles empty string', () => {
      const result = replaceVariables('', {
        projectName: 'my-app',
        midnightJsVersion: '1.0.0',
      });
      expect(result).toBe('');
    });
  });
});
