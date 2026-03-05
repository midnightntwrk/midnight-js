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

export interface TemplateInfo {
  name: string;
  description: string;
  path: string;
}

export interface TemplateMetadata {
  name: string;
  description: string;
  variables: Record<string, TemplateVariable>;
}

export interface TemplateVariable {
  type: 'string';
  required?: boolean;
  default?: string;
}

export interface ScaffoldOptions {
  projectName: string;
  targetDir: string;
  templateName: string;
}

export interface ScaffoldResult {
  projectPath: string;
  template: string;
  files: string[];
}

export interface PromptAnswers {
  projectName: string;
  template: string;
  installDependencies: boolean;
}

export interface CliOptions {
  template?: string;
}

export const MIDNIGHT_JS_VERSION = '3.2.0-rc.3';

export const TEMPLATE_FILE_EXTENSION = '.tpl';
