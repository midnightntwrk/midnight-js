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

export const MAX_SAFE_NAME_LENGTH = 255;

const SAFE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9._-]+)?$/;

/**
 * Asserts that `name` is safe to use as a single path segment or URL path
 * component. Rejects traversal payloads (`.`, `..`, separators), URL-encoded
 * characters, null bytes, whitespace, empty strings, and names longer than
 * {@link MAX_SAFE_NAME_LENGTH}.
 *
 * @param name  The value to validate.
 * @param label Human-readable name of the parameter (for error messages).
 * @throws Error if `name` fails validation.
 */
export function assertSafeName(name: string, label: string): void {
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_SAFE_NAME_LENGTH) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
  if (name === '.' || name === '..') {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
  if (!SAFE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
}

/**
 * Asserts that `version` is a valid SemVer-style version string of the shape
 * `MAJOR.MINOR.PATCH` with an optional pre-release suffix
 * (`-[A-Za-z0-9._-]+`). Build metadata (`+...`) is intentionally not
 * supported because compactc releases do not use it.
 *
 * @param version The version string to validate.
 * @param label   Human-readable name of the parameter (for error messages).
 * @throws Error if `version` is not SemVer-shaped.
 */
export function assertSemVer(version: string, label: string): void {
  if (typeof version !== 'string' || version.length === 0 || version.length > MAX_SAFE_NAME_LENGTH) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(version)}`);
  }
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(version)}`);
  }
}
