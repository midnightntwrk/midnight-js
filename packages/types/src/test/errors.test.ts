/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { ImportPasswordValidationError, PrivateStateImportError } from '../errors';

describe('ImportPasswordValidationError', () => {
  it('is a PrivateStateImportError so callers can catch all import failures via one base type', () => {
    const error = new ImportPasswordValidationError('Password is shorter than 16 characters');

    expect(error).toBeInstanceOf(PrivateStateImportError);
    expect(error).toBeInstanceOf(Error);
  });

  it('carries the invalid_password cause discriminant and preserves the message', () => {
    const error = new ImportPasswordValidationError('Password is shorter than 16 characters');

    expect(error.name).toBe('ImportPasswordValidationError');
    expect(error.cause).toBe('invalid_password');
    expect(error.message).toBe('Password is shorter than 16 characters');
  });
});
