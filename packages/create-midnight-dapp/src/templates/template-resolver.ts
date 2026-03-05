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
import { type TemplateInfo } from '../domain/types.js';
import { TemplateInvalidError, TemplateNotFoundError } from '../errors/scaffold-errors.js';
import { getTemplatesDir } from '../utils/path-utils.js';
import { getTemplate } from './template-registry.js';

export interface ResolvedTemplate {
  info: TemplateInfo;
  absolutePath: string;
}

export function resolveTemplate(
  templateName: string,
  fileSystem: FileSystemPort
): ResolvedTemplate {
  const info = getTemplate(templateName);
  if (!info) {
    throw new TemplateNotFoundError(templateName);
  }

  const templatesDir = getTemplatesDir();
  const absolutePath = path.join(templatesDir, info.path);

  if (!fileSystem.exists(absolutePath)) {
    throw new TemplateInvalidError(templateName, 'Template directory does not exist');
  }

  if (!fileSystem.isDirectory(absolutePath)) {
    throw new TemplateInvalidError(templateName, 'Template path is not a directory');
  }

  return { info, absolutePath };
}
