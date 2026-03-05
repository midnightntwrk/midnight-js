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

import path from 'node:path';

import { type FileSystemPort } from '../adapters/file-system.js';
import { TEMPLATE_FILE_EXTENSION } from '../domain/types.js';

export interface TransformVariables {
  projectName: string;
  midnightJsVersion: string;
}

export function replaceVariables(
  content: string,
  variables: TransformVariables
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    content
  );
}

function processFile(
  filePath: string,
  variables: TransformVariables,
  fileSystem: FileSystemPort,
  transformedFiles: string[]
): void {
  const fileName = path.basename(filePath);
  const isTemplate = fileName.endsWith(TEMPLATE_FILE_EXTENSION);
  const baseFileName = isTemplate
    ? fileName.slice(0, -TEMPLATE_FILE_EXTENSION.length)
    : fileName;

  if (baseFileName === '_package.json') {
    const content = fileSystem.readFile(filePath);
    const transformed = replaceVariables(content, variables);
    const newPath = path.join(path.dirname(filePath), 'package.json');
    fileSystem.writeFile(newPath, transformed);
    fileSystem.remove(filePath);
    transformedFiles.push(newPath);
    return;
  }

  if (baseFileName === '_gitignore') {
    const newPath = path.join(path.dirname(filePath), '.gitignore');
    if (isTemplate) {
      const content = fileSystem.readFile(filePath);
      const transformed = replaceVariables(content, variables);
      fileSystem.writeFile(newPath, transformed);
      fileSystem.remove(filePath);
    } else {
      fileSystem.rename(filePath, newPath);
    }
    transformedFiles.push(newPath);
    return;
  }

  if (isTemplate) {
    const content = fileSystem.readFile(filePath);
    const transformed = replaceVariables(content, variables);
    const newPath = filePath.slice(0, -TEMPLATE_FILE_EXTENSION.length);
    fileSystem.writeFile(newPath, transformed);
    fileSystem.remove(filePath);
    transformedFiles.push(newPath);
    return;
  }
}

function processDirectory(
  dirPath: string,
  variables: TransformVariables,
  fileSystem: FileSystemPort,
  transformedFiles: string[]
): void {
  const entries = fileSystem.readdir(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);

    if (fileSystem.isDirectory(fullPath)) {
      processDirectory(fullPath, variables, fileSystem, transformedFiles);
    } else {
      processFile(fullPath, variables, fileSystem, transformedFiles);
    }
  }
}

export function transformTemplateFiles(
  targetDir: string,
  variables: TransformVariables,
  fileSystem: FileSystemPort
): string[] {
  const transformedFiles: string[] = [];
  processDirectory(targetDir, variables, fileSystem, transformedFiles);
  return transformedFiles;
}
