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

import { assertDefined, assertUndefined } from '../assertion-utils';

describe('assertDefined', () => {
  it('does not throw for truthy values', () => {
    expect(() => assertDefined(1)).not.toThrow();
    expect(() => assertDefined('hello')).not.toThrow();
    expect(() => assertDefined({})).not.toThrow();
    expect(() => assertDefined(true)).not.toThrow();
  });

  it('does not throw for falsy but defined values', () => {
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined('')).not.toThrow();
    expect(() => assertDefined(false)).not.toThrow();
    expect(() => assertDefined(0n)).not.toThrow();
  });

  it('throws for null', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined');
  });

  it('throws for undefined', () => {
    expect(() => assertDefined(undefined)).toThrow('Expected value to be defined');
  });

  it('throws with custom message', () => {
    expect(() => assertDefined(null, 'custom error')).toThrow('custom error');
  });
});

describe('assertUndefined', () => {
  it('does not throw for null', () => {
    expect(() => assertUndefined(null)).not.toThrow();
  });

  it('does not throw for undefined', () => {
    expect(() => assertUndefined(undefined)).not.toThrow();
  });

  it('throws for truthy values', () => {
    expect(() => assertUndefined(1)).toThrow('Expected value to be null or undefined');
    expect(() => assertUndefined('hello')).toThrow('Expected value to be null or undefined');
    expect(() => assertUndefined({})).toThrow('Expected value to be null or undefined');
  });

  it('throws for falsy but defined values', () => {
    expect(() => assertUndefined(0)).toThrow('Expected value to be null or undefined');
    expect(() => assertUndefined('')).toThrow('Expected value to be null or undefined');
    expect(() => assertUndefined(false)).toThrow('Expected value to be null or undefined');
    expect(() => assertUndefined(0n)).toThrow('Expected value to be null or undefined');
  });

  it('throws with custom message', () => {
    expect(() => assertUndefined(1, 'custom error')).toThrow('custom error');
  });
});
