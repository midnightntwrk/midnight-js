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

import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { describe, expect, it } from 'vitest';

import { UTILS_ERROR_CODES } from '../error-codes';
import { parseSerializedTag } from '../serialized-tag';

const utf8 = (s: string) => new TextEncoder().encode(s);
const COLON_BYTE = 0x3a;
const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

describe('parseSerializedTag', () => {
  it('parses a well-formed prefix to the second colon', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:payload-bytes'));
    expect(parsed.namespace).toBe('midnight');
    expect(parsed.version).toBe('v8');
    expect(parsed.tag).toBe('midnight:v8');
    expect(parsed.body).toEqual(utf8('payload-bytes'));
  });

  it.each([
    ['missing second colon', utf8('midnight:v8payload')],
    ['no colon at all', utf8('justbytes')],
    ['oversized prefix', utf8(`${'x'.repeat(65)}:v8:b`)],
    ['empty input', new Uint8Array(0)],
    ['invalid UTF-8 in the prefix', new Uint8Array([0xff, 0xfe, COLON_BYTE, 0x76, COLON_BYTE])],
    ['degenerate empty namespace and version', utf8('::body')],
    ['degenerate empty namespace only', utf8(':v8:body')],
    ['degenerate empty version only', utf8('midnight::body')],
    ['a control character (newline) in the namespace', utf8('mid\nnight:v8:body')]
  ])('throws the typed error on %s', (_name, bytes) => {
    expect(() => parseSerializedTag(bytes)).toThrow(
      expect.objectContaining({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED })
    );
  });

  it('throws without scanning the full 10MB — scan bounded by MAX_TAG_PREFIX_BYTES', () => {
    const big = new Uint8Array(10_000_000); // no colon anywhere
    expect(() => parseSerializedTag(big)).toThrow();
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

  it('surfaces the original TextDecoder failure as the typed error cause on invalid UTF-8', () => {
    try {
      parseSerializedTag(new Uint8Array([0xff, 0xfe, COLON_BYTE, 0x76, COLON_BYTE]));
      expect.fail('expected parseSerializedTag to throw');
    } catch (e) {
      expect((e as Error).cause).toBeInstanceOf(TypeError);
    }
  });

  it('parses the bracketed version segment the ledger runtimes actually emit', () => {
    // Minted here rather than hardcoded: the tag is whatever the pinned
    // runtime writes, and a runtime that changed its tag shape should fail
    // this test rather than quietly go unparsed at a provider seam.
    const serialized = new ContractState().serialize();

    const parsed = parseSerializedTag(serialized);

    expect(parsed.namespace).toBe('midnight');
    expect(parsed.version).toMatch(/^contract-state\[v\d+\]$/);
    expect(parsed.body).toEqual(serialized.slice(parsed.tag.length + 1));
  });

  it.each([
    ['whitespace inside a bracketed version', utf8('midnight:contract state[v8]:body')],
    ['a newline inside a bracketed version', utf8('midnight:contract-state[v8\n]:body')],
    ['a bracketed version that is otherwise empty', utf8('midnight::body')]
  ])('still rejects %s now that brackets are accepted', (_name, bytes) => {
    expect(() => parseSerializedTag(bytes)).toThrow(
      expect.objectContaining({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED })
    );
  });

  it('produces a body that is empty when the tag ends at the last byte', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:'));
    expect(parsed.tag).toBe('midnight:v8');
    expect(parsed.body).toEqual(new Uint8Array(0));
  });

  it('parses a body that itself contains colon bytes, keeping only the first two as the boundary', () => {
    const parsed = parseSerializedTag(utf8('midnight:v8:a:b:c'));
    expect(parsed.namespace).toBe('midnight');
    expect(parsed.version).toBe('v8');
    expect(parsed.body).toEqual(utf8('a:b:c'));
  });

  it('passes raw binary body bytes (including 0x3a) through unmodified', () => {
    const binaryBody = new Uint8Array([0x00, 0x41, COLON_BYTE, 0x42, 0xff]);
    const parsed = parseSerializedTag(concatBytes(utf8('midnight:v8:'), binaryBody));
    expect(parsed.body).toEqual(binaryBody);
  });

  it('returns a body independent of the input buffer (defensive copy)', () => {
    const bytes = utf8('midnight:v8:payload');
    const parsed = parseSerializedTag(bytes);
    bytes[bytes.length - 1] = 0x00;
    expect(parsed.body).toEqual(utf8('payload'));
  });

  describe('64-byte prefix scan boundary', () => {
    // Second colon at index 63 is the last byte the scan (i < 64) inspects.
    it('parses when the second colon lands exactly on byte index 63', () => {
      const namespace = 'a';
      const version = 'v'.repeat(61); // 'a' (1) + ':' (1) + 61 chars => second colon at index 63
      const bytes = utf8(`${namespace}:${version}:body`);
      expect(bytes[63]).toBe(COLON_BYTE);

      const parsed = parseSerializedTag(bytes);
      expect(parsed.namespace).toBe(namespace);
      expect(parsed.version).toBe(version);
      expect(parsed.body).toEqual(utf8('body'));
    });

    it('throws when the second colon lands on byte index 64 (just past the scan window)', () => {
      const namespace = 'a';
      const version = 'v'.repeat(62); // second colon would land at index 64
      const bytes = utf8(`${namespace}:${version}:body`);
      expect(bytes[64]).toBe(COLON_BYTE);

      expect(() => parseSerializedTag(bytes)).toThrow(
        expect.objectContaining({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED })
      );
    });
  });
});
