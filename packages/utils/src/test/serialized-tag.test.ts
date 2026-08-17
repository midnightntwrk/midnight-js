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

import { describe, expect, it } from 'vitest';

import { UTILS_ERROR_CODES } from '../error-codes';
import { parseSerializedTag } from '../serialized-tag';

const utf8 = (s: string) => new TextEncoder().encode(s);
const COLON_BYTE = 0x3a;

describe('parseSerializedTag', () => {
  it('parses a well-formed prefix to the second colon', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:payload-bytes'));
    expect(parsed.tag).toBe('midnight:v8');
    expect(parsed.body).toEqual(utf8('payload-bytes'));
  });

  it.each([
    ['missing second colon', utf8('midnight:v8payload')],
    ['no colon at all', utf8('justbytes')],
    ['oversized prefix', utf8(`${'x'.repeat(65)}:v8:b`)],
    ['empty input', new Uint8Array(0)]
  ])('throws the typed error on %s', (_name, bytes) => {
    expect(() => parseSerializedTag(bytes)).toThrow(
      expect.objectContaining({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED })
    );
  });

  it('never scans past the bound', () => {
    const big = new Uint8Array(10_000_000); // no colon anywhere
    expect(() => parseSerializedTag(big)).toThrow(); // returns fast — bounded at 64 bytes
  });

  it('names the error and states the tag is a defence-in-depth discriminant only', () => {
    expect(() => parseSerializedTag(utf8('justbytes'))).toThrow(/defence-in-depth|not.*authorit/i);
  });

  it.each([
    ['no colon at all', utf8('justbytes')],
    ['invalid UTF-8 in the prefix', new Uint8Array([0xff, 0xfe, COLON_BYTE, 0x76, COLON_BYTE])]
  ])('states a concrete remediation next step on %s', (_name, bytes) => {
    expect(() => parseSerializedTag(bytes)).toThrow(/verify the payload came from a sanctioned serialization seam/);
  });

  it('produces a body that is empty when the tag ends at the last byte', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:'));
    expect(parsed.tag).toBe('midnight:v8');
    expect(parsed.body).toEqual(new Uint8Array(0));
  });
});
