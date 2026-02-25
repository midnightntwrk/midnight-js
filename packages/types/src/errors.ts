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
 * An error thrown when exporting signing keys fails.
 */
export class SigningKeyExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigningKeyExportError';
  }
}

/**
 * Cause types for private state import errors.
 */
export type PrivateStateImportErrorCause =
  | 'decryption_failed'
  | 'invalid_format'
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
 * Error thrown when decryption of export data fails.
 * This could be due to wrong password, corrupted data, or tampered content.
 * The specific cause is intentionally not disclosed to prevent oracle attacks.
 */
export class ExportDecryptionError extends PrivateStateImportError {
  constructor() {
    super(
      'Failed to decrypt export data. The password may be incorrect or the data may be corrupted.',
      'decryption_failed'
    );
    this.name = 'ExportDecryptionError';
  }
}

/**
 * Error thrown when the export data format is invalid.
 */
export class InvalidExportFormatError extends PrivateStateImportError {
  constructor(message = 'Invalid export format') {
    super(message, 'invalid_format');
    this.name = 'InvalidExportFormatError';
  }
}

/**
 * Error thrown when import conflicts with existing data and conflictStrategy is 'error'.
 */
export class ImportConflictError extends PrivateStateImportError {
  constructor(
    public readonly conflictCount: number,
    entityName = 'private state'
  ) {
    super(
      `Import conflicts with ${conflictCount} existing ${entityName}${conflictCount === 1 ? '' : 's'}`,
      'conflict'
    );
    this.name = 'ImportConflictError';
  }
}
