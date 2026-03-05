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

import fs from 'node:fs';
import path from 'node:path';

import { FileSystemError } from '../errors/scaffold-errors.js';

export interface FileSystemPort {
  exists(filePath: string): boolean;
  isDirectory(filePath: string): boolean;
  isEmptyDirectory(dirPath: string): boolean;
  readFile(filePath: string): string;
  writeFile(filePath: string, content: string): void;
  copyDirectory(src: string, dest: string): void;
  mkdir(dirPath: string): void;
  readdir(dirPath: string): string[];
  rename(oldPath: string, newPath: string): void;
  remove(filePath: string): void;
}

export function createFileSystemAdapter(): FileSystemPort {
  return {
    exists(filePath: string): boolean {
      return fs.existsSync(filePath);
    },

    isDirectory(filePath: string): boolean {
      try {
        return fs.statSync(filePath).isDirectory();
      } catch {
        return false;
      }
    },

    isEmptyDirectory(dirPath: string): boolean {
      if (!fs.existsSync(dirPath)) {
        return true;
      }
      const files = fs.readdirSync(dirPath);
      return files.length === 0;
    },

    readFile(filePath: string): string {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        throw new FileSystemError('Failed to read file', filePath, { cause: error });
      }
    },

    writeFile(filePath: string, content: string): void {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
      } catch (error) {
        throw new FileSystemError('Failed to write file', filePath, { cause: error });
      }
    },

    copyDirectory(src: string, dest: string): void {
      try {
        fs.cpSync(src, dest, { recursive: true });
      } catch (error) {
        throw new FileSystemError('Failed to copy directory', src, { cause: error });
      }
    },

    mkdir(dirPath: string): void {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error) {
        throw new FileSystemError('Failed to create directory', dirPath, { cause: error });
      }
    },

    readdir(dirPath: string): string[] {
      try {
        return fs.readdirSync(dirPath);
      } catch (error) {
        throw new FileSystemError('Failed to read directory', dirPath, { cause: error });
      }
    },

    rename(oldPath: string, newPath: string): void {
      try {
        fs.renameSync(oldPath, newPath);
      } catch (error) {
        throw new FileSystemError('Failed to rename file', oldPath, { cause: error });
      }
    },

    remove(filePath: string): void {
      try {
        fs.rmSync(filePath, { force: true });
      } catch (error) {
        throw new FileSystemError('Failed to remove file', filePath, { cause: error });
      }
    },
  };
}

export const fileSystem = createFileSystemAdapter();
