/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

/**
 * An error describing an invalid protocol scheme.
 */
export class InvalidProtocolSchemeError extends Error {
  /**
   * @param invalidScheme The invalid scheme.
   * @param allowableSchemes The valid schemes that are allowed.
   */
  constructor(
    public readonly invalidScheme: string,
    public readonly allowableSchemes: string[]
  ) {
    super(`Invalid protocol scheme: '${invalidScheme}'. Allowable schemes are one of: ${allowableSchemes.join(',')}`);
  }
}

/**
 * An error thrown when exporting private states fails.
 */
export class PrivateStateExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivateStateExportError';
  }
}

/**
 * Cause types for private state import errors.
 */
export type PrivateStateImportErrorCause =
  | 'wrong_password'
  | 'corrupted_data'
  | 'version_mismatch'
  | 'conflict'
  | 'unknown';

/**
 * Base error thrown when importing private states fails.
 */
export class PrivateStateImportError extends Error {
  constructor(
    message: string,
    public readonly cause?: PrivateStateImportErrorCause
  ) {
    super(message);
    this.name = 'PrivateStateImportError';
  }
}

/**
 * Error thrown when the export password is incorrect during import.
 */
export class WrongExportPasswordError extends PrivateStateImportError {
  constructor() {
    super(
      'Failed to decrypt export data. The password may be incorrect or the data may be corrupted.',
      'wrong_password'
    );
    this.name = 'WrongExportPasswordError';
  }
}

/**
 * Error thrown when the export data is corrupted or invalid.
 */
export class CorruptedExportDataError extends PrivateStateImportError {
  constructor(details?: string) {
    super(
      `Export data is corrupted or invalid${details ? `: ${details}` : ''}`,
      'corrupted_data'
    );
    this.name = 'CorruptedExportDataError';
  }
}

/**
 * Error thrown when the export version is not supported.
 */
export class UnsupportedExportVersionError extends PrivateStateImportError {
  constructor(
    public readonly foundVersion: number,
    public readonly supportedVersions: number[]
  ) {
    super(
      `Export version ${foundVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
      'version_mismatch'
    );
    this.name = 'UnsupportedExportVersionError';
  }
}

/**
 * Error thrown when import conflicts with existing data and conflictStrategy is 'error'.
 */
export class ImportConflictError extends PrivateStateImportError {
  constructor(public readonly conflictingIds: string[]) {
    super(
      `Import conflicts with existing private states: ${conflictingIds.join(', ')}`,
      'conflict'
    );
    this.name = 'ImportConflictError';
  }
}
