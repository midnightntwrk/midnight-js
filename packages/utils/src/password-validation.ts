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

export const MIN_PASSWORD_LENGTH = 16;
export const MIN_CHARACTER_CLASSES = 3;
export const MAX_CONSECUTIVE_REPEATED = 3;
export const MIN_SEQUENTIAL_LENGTH = 4;

/**
 * Reason categories for password validation failures.
 */
export type PasswordValidationFailure =
  | 'missing'
  | 'too_short'
  | 'insufficient_classes'
  | 'repeated_characters'
  | 'sequential_pattern';

/**
 * Thrown when a password does not satisfy the strength policy applied to
 * private storage and export/import operations.
 */
export class PasswordValidationError extends Error {
  constructor(
    message: string,
    public readonly reason: PasswordValidationFailure
  ) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

const countCharacterClasses = (password: string): number => {
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/[0-9]/.test(password)) count++;
  if (/[^a-zA-Z0-9]/.test(password)) count++;
  return count;
};

const hasRepeatedCharacters = (password: string): boolean => {
  let consecutiveCount = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      consecutiveCount++;
      if (consecutiveCount > MAX_CONSECUTIVE_REPEATED) {
        return true;
      }
    } else {
      consecutiveCount = 1;
    }
  }
  return false;
};

const hasSequentialPattern = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();

  for (let i = 0; i <= lowerPassword.length - MIN_SEQUENTIAL_LENGTH; i++) {
    let ascendingCount = 1;
    let descendingCount = 1;

    for (let j = 1; j < MIN_SEQUENTIAL_LENGTH; j++) {
      const currentCode = lowerPassword.charCodeAt(i + j);
      const prevCode = lowerPassword.charCodeAt(i + j - 1);

      if (currentCode === prevCode + 1) {
        ascendingCount++;
      } else {
        ascendingCount = 1;
      }

      if (currentCode === prevCode - 1) {
        descendingCount++;
      } else {
        descendingCount = 1;
      }

      if (ascendingCount >= MIN_SEQUENTIAL_LENGTH || descendingCount >= MIN_SEQUENTIAL_LENGTH) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Shared password strength policy for private storage and export/import operations.
 * Throws {@link PasswordValidationError} on the first violated rule.
 */
export const validatePassword = (password: string): void => {
  if (!password) {
    throw new PasswordValidationError(
      'Password is required for private state encryption.\n' +
        'Please provide a password via privateStoragePasswordProvider in the configuration.',
      'missing'
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordValidationError(
      `Password is shorter than ${MIN_PASSWORD_LENGTH} characters`,
      'too_short'
    );
  }

  if (hasRepeatedCharacters(password)) {
    throw new PasswordValidationError(
      `Password contains too many repeated characters (more than ${MAX_CONSECUTIVE_REPEATED} identical in a row)`,
      'repeated_characters'
    );
  }

  const characterClasses = countCharacterClasses(password);
  if (characterClasses < MIN_CHARACTER_CLASSES) {
    throw new PasswordValidationError(
      `Password must contain at least ${MIN_CHARACTER_CLASSES} of: uppercase letters, lowercase letters, digits, special characters. Found: ${characterClasses}`,
      'insufficient_classes'
    );
  }

  if (hasSequentialPattern(password)) {
    throw new PasswordValidationError(
      "Password contains sequential patterns (e.g., '1234', 'abcd'). Use a more random password",
      'sequential_pattern'
    );
  }
};
