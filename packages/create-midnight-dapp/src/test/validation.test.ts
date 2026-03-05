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

import { isValidPackageName, toValidPackageName } from '../utils/validation.js';

describe('validation', () => {
  describe('isValidPackageName', () => {
    it('accepts valid simple names', () => {
      expect(isValidPackageName('my-app')).toBe(true);
      expect(isValidPackageName('myapp')).toBe(true);
      expect(isValidPackageName('my-cool-app')).toBe(true);
      expect(isValidPackageName('app123')).toBe(true);
    });

    it('accepts valid scoped names', () => {
      expect(isValidPackageName('@midnight/my-app')).toBe(true);
      expect(isValidPackageName('@scope/package')).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(isValidPackageName('')).toBe(false);
    });

    it('rejects names with spaces', () => {
      expect(isValidPackageName('my app')).toBe(false);
    });

    it('rejects names with uppercase letters', () => {
      expect(isValidPackageName('MyApp')).toBe(false);
      expect(isValidPackageName('MY-APP')).toBe(false);
    });

    it('rejects names starting with special characters', () => {
      expect(isValidPackageName('.hidden')).toBe(false);
      expect(isValidPackageName('_private')).toBe(false);
    });
  });

  describe('toValidPackageName', () => {
    it('converts spaces to dashes', () => {
      expect(toValidPackageName('my app')).toBe('my-app');
      expect(toValidPackageName('my  cool  app')).toBe('my-cool-app');
    });

    it('converts to lowercase', () => {
      expect(toValidPackageName('MyApp')).toBe('myapp');
      expect(toValidPackageName('MY-APP')).toBe('my-app');
    });

    it('removes invalid characters', () => {
      expect(toValidPackageName('my@app!')).toBe('my-app');
    });

    it('removes leading special characters', () => {
      expect(toValidPackageName('.hidden')).toBe('hidden');
      expect(toValidPackageName('_private')).toBe('private');
    });

    it('trims whitespace', () => {
      expect(toValidPackageName('  my-app  ')).toBe('my-app');
    });
  });
});
