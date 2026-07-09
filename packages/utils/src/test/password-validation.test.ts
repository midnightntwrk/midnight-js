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

import { describe, expect, it } from 'vitest';

import { PasswordValidationError, type PasswordValidationFailure, validatePassword } from '../password-validation';

describe('validatePassword', () => {
  describe('rejects passwords with PasswordValidationError', () => {
    it.each<[PasswordValidationFailure, string]>([
      ['missing', ''],
      ['too_short', 'short'],
      ['repeated_characters', 'aaaaaaaaaaaaaaaa'],
      ['insufficient_classes', 'abcdefghjkmnpqrs'],
      ['sequential_pattern', 'Password-123456!']
    ])('throws with reason "%s"', (reason, password) => {
      try {
        validatePassword(password);
        expect.fail('Expected PasswordValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PasswordValidationError);
        if (error instanceof PasswordValidationError) {
          expect(error.reason).toBe(reason);
        }
      }
    });

    it('does not leak actual password length in the "too_short" message', () => {
      try {
        validatePassword('short');
        expect.fail('Expected PasswordValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PasswordValidationError);
        if (error instanceof PasswordValidationError) {
          expect(error.message).not.toMatch(/length/i);
          expect(error.message).not.toContain('5');
        }
      }
    });
  });

  describe('accepts strong passwords', () => {
    it.each([
      'Xk9$mP2!qR7@nL4#',
      'aX1!bY2@cZ3#mN4$',
      'Pass-abc-XYZ-12!',
      'Paaa-ssword-123!'
    ])('accepts %s', (password) => {
      expect(() => validatePassword(password)).not.toThrow();
    });
  });
});
