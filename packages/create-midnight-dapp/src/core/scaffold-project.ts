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

import { fileSystem as defaultFileSystem, type FileSystemPort } from '../adapters/file-system.js';
import { packageManager as defaultPackageManager, type PackageManagerPort } from '../adapters/package-manager.js';
import { MIDNIGHT_JS_VERSION, type ScaffoldOptions, type ScaffoldResult } from '../domain/types.js';
import { DirectoryNotEmptyError, InvalidProjectNameError } from '../errors/scaffold-errors.js';
import { resolveTemplate } from '../templates/template-resolver.js';
import { transformTemplateFiles, type TransformVariables } from '../templates/template-transformer.js';
import { logger } from '../utils/logger.js';
import { isValidPackageName, toValidPackageName } from '../utils/validation.js';

export interface ScaffoldDependencies {
  fileSystem?: FileSystemPort;
  packageManager?: PackageManagerPort;
}

function normalizeProjectName(input: string): string {
  const trimmed = input.trim();
  if (isValidPackageName(trimmed)) {
    return trimmed;
  }
  return toValidPackageName(trimmed);
}

function validateProjectName(projectName: string): void {
  if (!isValidPackageName(projectName)) {
    throw new InvalidProjectNameError(projectName);
  }
}

function validateTargetDirectory(targetDir: string, fileSystem: FileSystemPort): void {
  if (!fileSystem.isEmptyDirectory(targetDir)) {
    throw new DirectoryNotEmptyError(targetDir);
  }
}

export async function scaffoldProject(
  options: ScaffoldOptions,
  installDependencies: boolean,
  deps: ScaffoldDependencies = {}
): Promise<ScaffoldResult> {
  const fileSystem = deps.fileSystem ?? defaultFileSystem;
  const packageMgr = deps.packageManager ?? defaultPackageManager;

  const projectName = normalizeProjectName(options.projectName);
  const targetDir = options.targetDir;

  validateProjectName(projectName);
  validateTargetDirectory(targetDir, fileSystem);

  logger.step(`Creating project in ${targetDir}`);

  const resolvedTemplate = resolveTemplate(options.templateName, fileSystem);

  fileSystem.copyDirectory(resolvedTemplate.absolutePath, targetDir);

  const variables: TransformVariables = {
    projectName,
    midnightJsVersion: MIDNIGHT_JS_VERSION,
  };

  const transformedFiles = transformTemplateFiles(targetDir, variables, fileSystem);

  logger.success(`Created project "${projectName}"`);

  if (installDependencies) {
    packageMgr.install(targetDir);
  }

  return {
    projectPath: targetDir,
    template: options.templateName,
    files: transformedFiles,
  };
}
