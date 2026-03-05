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

import { getTemplate, getTemplateNames, templates } from '../templates/template-registry.js';

describe('template-registry', () => {
  describe('templates', () => {
    it('has at least one template', () => {
      expect(templates.length).toBeGreaterThan(0);
    });

    it('has react-dapp template', () => {
      const reactDapp = templates.find((t) => t.name === 'react-dapp');
      expect(reactDapp).toBeDefined();
      expect(reactDapp?.description).toBeTruthy();
      expect(reactDapp?.path).toBeTruthy();
    });
  });

  describe('getTemplate', () => {
    it('returns template for valid name', () => {
      const template = getTemplate('react-dapp');
      expect(template).toBeDefined();
      expect(template?.name).toBe('react-dapp');
    });

    it('returns undefined for invalid name', () => {
      const template = getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateNames', () => {
    it('returns array of template names', () => {
      const names = getTemplateNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain('react-dapp');
    });
  });
});
