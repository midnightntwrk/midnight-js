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

const SIGNING_KEY_MIN_HEX_LENGTH = 6;
const SIGNING_KEY_KINDS: readonly string[] = ['schnorr', 'ecdsa'];

const isValidSigningKeyHex = (value: string): boolean =>
  value.length >= SIGNING_KEY_MIN_HEX_LENGTH
  && value.length % 2 === 0
  && /^[0-9a-fA-F]+$/.test(value);

/**
 * Determines whether `value` is a structurally valid signing key of the shape
 * `{ tag: 'schnorr' | 'ecdsa', value: <hex> }`, where `value` is a non-empty,
 * even-length, lowercase-or-uppercase hex string of at least
 * {@link SIGNING_KEY_MIN_HEX_LENGTH} characters.
 *
 * Pure predicate (never throws) so callers can attach their own domain error.
 *
 * @param value The value to validate (typically a parsed import payload entry).
 * @returns `true` if `value` matches the structured signing-key shape.
 */
export const isValidSigningKey = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.tag === 'string'
    && SIGNING_KEY_KINDS.includes(candidate.tag)
    && typeof candidate.value === 'string'
    && isValidSigningKeyHex(candidate.value);
};
