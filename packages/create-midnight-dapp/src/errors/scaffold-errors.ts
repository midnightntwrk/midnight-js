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

export class ScaffoldError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ScaffoldError';
  }
}

export class InvalidProjectNameError extends ScaffoldError {
  constructor(public readonly projectName: string) {
    super(`Invalid project name: "${projectName}". Must be a valid npm package name.`);
    this.name = 'InvalidProjectNameError';
  }
}

export class DirectoryNotEmptyError extends ScaffoldError {
  constructor(public readonly directory: string) {
    super(`Directory "${directory}" is not empty.`);
    this.name = 'DirectoryNotEmptyError';
  }
}

export class TemplateNotFoundError extends ScaffoldError {
  constructor(public readonly templateName: string) {
    super(`Template "${templateName}" not found.`);
    this.name = 'TemplateNotFoundError';
  }
}

export class TemplateInvalidError extends ScaffoldError {
  constructor(
    public readonly templateName: string,
    reason: string
  ) {
    super(`Template "${templateName}" is invalid: ${reason}`);
    this.name = 'TemplateInvalidError';
  }
}

export class FileSystemError extends ScaffoldError {
  constructor(
    message: string,
    public readonly path: string,
    options?: ErrorOptions
  ) {
    super(`${message}: ${path}`, options);
    this.name = 'FileSystemError';
  }
}

export class DependencyInstallError extends ScaffoldError {
  constructor(
    public readonly directory: string,
    options?: ErrorOptions
  ) {
    super(`Failed to install dependencies in "${directory}"`, options);
    this.name = 'DependencyInstallError';
  }
}
