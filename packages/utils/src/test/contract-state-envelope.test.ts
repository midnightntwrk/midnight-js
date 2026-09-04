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

import { contractStateEnvelopeVersion } from '../contract-state-envelope';
import { TagParseError } from '../serialized-tag';

// The mapping's own behaviour, tested here with the mapping. What the two ledger RUNTIMES actually
// write is pinned separately, against real minted states, by
// `packages/indexer-public-data-provider/src/test/raw-contract-state.test.ts` -- that assertion needs
// both ledger runtimes as devDependencies, which is why it stays in that package and reaches this
// implementation through its import.
const envelope = (tag: string, body = 'state-body'): Uint8Array =>
  Uint8Array.from(Buffer.from(`${tag}:${body}`, 'utf8'));

describe('contractStateEnvelopeVersion', () => {
  it('maps the pre-fork contract-state envelope onto the v8 ledger era', () => {
    expect(contractStateEnvelopeVersion(envelope('midnight:contract-state[v6]'))).toBe('v8');
  });

  it('maps the post-fork contract-state envelope onto the v9 ledger era', () => {
    expect(contractStateEnvelopeVersion(envelope('midnight:contract-state[v8]'))).toBe('v9');
  });

  it('reads only the tag, so a body it cannot decode is still dated', () => {
    // The whole point of reading the envelope rather than deserializing: a caller has to know which
    // runtime to hand bytes to BEFORE it hands them over, including when the body is unreadable.
    const corruptBody = Uint8Array.from([
      ...Buffer.from('midnight:contract-state[v8]:', 'utf8'),
      0xff,
      0x00,
      0xfe
    ]);

    expect(contractStateEnvelopeVersion(corruptBody)).toBe('v9');
  });

  it.each([
    // A state format version that exists in the family but names no supported runtime. The reason
    // an era is never derived from a `[vN]` by arithmetic: `[v7]` is not "between" the two eras.
    ['an unsupported contract-state format version', 'midnight:contract-state[v7]'],
    // A real, well-formed tag of the wrong TYPE. Parses cleanly, so only the table rejects it.
    ['a verifier key rather than a contract state', 'midnight:verifier-key[v6]'],
    // The transaction envelope, whose own `[vN]` is unrelated to either era above.
    ['a transaction rather than a contract state', 'midnight:transaction[v9]'],
    ['a foreign namespace', 'notmidnight:contract-state[v8]']
  ])('refuses %s', (_label, tag) => {
    expect(() => contractStateEnvelopeVersion(envelope(tag))).toThrow(TagParseError);
  });

  it('refuses bytes carrying no tag prefix at all', () => {
    expect(() => contractStateEnvelopeVersion(Uint8Array.from([1, 2, 3, 4]))).toThrow(TagParseError);
  });

  it('does not echo the rejected tag into the error message', () => {
    // The tag is attacker-controlled and validated only against a character set, so repeating it
    // verbatim would let a crafted payload put arbitrary text into an error and a log line.
    const hostileTag = 'midnight:contract-state[v99-injected]';

    try {
      contractStateEnvelopeVersion(envelope(hostileTag));
      expect.unreachable('an unsupported envelope tag was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(TagParseError);
      expect((error as TagParseError).message).not.toContain('v99-injected');
    }
  });
});
