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

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VersionManager } from '../version-manager';

describe('VersionManager', () => {
  let packageDir: string;
  let managedDir: string;

  beforeEach(() => {
    packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-manager-'));
    managedDir = path.join(packageDir, 'managed');
    fs.mkdirSync(managedDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(packageDir, { recursive: true, force: true });
  });

  const writeFakeCompactc = (version: string): void => {
    const dir = path.join(managedDir, version);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'compactc'), '#!/bin/sh\n');
  };

  describe('happy path', () => {
    it('getVersionDir returns a directory inside managed/', () => {
      // Arrange
      const vm = new VersionManager(packageDir);
      // Act
      const dir = vm.getVersionDir('0.20.0');
      // Assert
      expect(dir).toBe(path.join(managedDir, '0.20.0'));
    });

    it('versionExists returns true when compactc is present', () => {
      writeFakeCompactc('0.20.0');
      const vm = new VersionManager(packageDir);
      expect(vm.versionExists('0.20.0')).toBe(true);
    });

    it('listVersions returns sorted directory names', () => {
      writeFakeCompactc('0.20.0');
      writeFakeCompactc('0.21.0');
      writeFakeCompactc('0.10.0');
      const vm = new VersionManager(packageDir);
      expect(vm.listVersions()).toEqual(['0.10.0', '0.20.0', '0.21.0']);
    });

    it('removeVersion deletes a managed version directory', () => {
      writeFakeCompactc('0.20.0');
      const vm = new VersionManager(packageDir);
      vm.removeVersion('0.20.0');
      expect(fs.existsSync(path.join(managedDir, '0.20.0'))).toBe(false);
      expect(fs.existsSync(managedDir)).toBe(true);
    });

    it('cleanupOldVersions keeps the newest N versions', () => {
      writeFakeCompactc('0.10.0');
      writeFakeCompactc('0.20.0');
      writeFakeCompactc('0.21.0');
      const vm = new VersionManager(packageDir);
      vm.cleanupOldVersions(2);
      expect(vm.listVersions()).toEqual(['0.20.0', '0.21.0']);
    });
  });

  describe('rejects unsafe version', () => {
    let vm: VersionManager;
    beforeEach(() => {
      vm = new VersionManager(packageDir);
    });

    it.each([
      '.',
      '..',
      '../../etc',
      '/etc/passwd',
      'foo/bar',
      'not-semver',
      '1.2',
      'v1.2.3',
      '',
      '1.2.3 '
    ])('getVersionDir rejects %s', (version) => {
      expect(() => vm.getVersionDir(version)).toThrow(/Invalid version/);
    });

    it('versionExists rejects ".."', () => {
      expect(() => vm.versionExists('..')).toThrow(/Invalid version/);
    });

    it('getCompactcPath rejects "../"', () => {
      expect(() => vm.getCompactcPath('../escape')).toThrow(/Invalid version/);
    });

    it('removeVersion rejects "."', () => {
      // Arrange — sentinel proving managed/ is intact afterwards
      writeFakeCompactc('0.20.0');
      // Act + Assert
      expect(() => vm.removeVersion('.')).toThrow(/Invalid version/);
      // Assert (sentinel survived — this is the entire point of the fix)
      expect(fs.existsSync(path.join(managedDir, '0.20.0'))).toBe(true);
      expect(fs.existsSync(managedDir)).toBe(true);
    });

    it('removeVersion rejects ".."', () => {
      writeFakeCompactc('0.20.0');
      expect(() => vm.removeVersion('..')).toThrow(/Invalid version/);
      expect(fs.existsSync(packageDir)).toBe(true);
      expect(fs.existsSync(managedDir)).toBe(true);
    });
  });
});
