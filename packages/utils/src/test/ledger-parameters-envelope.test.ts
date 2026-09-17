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

import { ledgerParametersEnvelopeVersion } from '../ledger-parameters-envelope';
import { TagParseError } from '../serialized-tag';

// The mapping's own behaviour, tested here with the mapping. What the two ledger RUNTIMES actually
// write is pinned separately, against real minted parameters, by
// `packages/indexer-public-data-provider/src/test/ledger-parameters.test.ts`.
const envelope = (tag: string, body = 'parameters-body'): Uint8Array =>
  Uint8Array.from(Buffer.from(`${tag}:${body}`, 'utf8'));

describe('ledgerParametersEnvelopeVersion', () => {
  it('maps the pre-fork ledger-parameters envelope onto the v8 ledger era', () => {
    expect(ledgerParametersEnvelopeVersion(envelope('midnight:ledger-parameters[v5]'))).toBe('v8');
  });

  it('maps the post-fork ledger-parameters envelope onto the v9 ledger era', () => {
    expect(ledgerParametersEnvelopeVersion(envelope('midnight:ledger-parameters[v8]'))).toBe('v9');
  });

  it('reads only the tag, so a body it cannot decode is still dated', () => {
    const corruptBody = Uint8Array.from([...Buffer.from('midnight:ledger-parameters[v8]:', 'utf8'), 0xff, 0x00, 0xfe]);

    expect(ledgerParametersEnvelopeVersion(corruptBody)).toBe('v9');
  });

  it.each([
    // The number in the brackets is the parameter schema version, not the era, and the two families
    // number independently: `[v6]` is a CONTRACT STATE written by the v8 ledger, and reading it as a
    // parameter version by pattern would date these bytes to the era that never wrote them.
    ['a contract state rather than ledger parameters', 'midnight:contract-state[v6]'],
    ['a zswap ledger state rather than ledger parameters', 'midnight:zswap-ledger-state[v5]'],
    ['a parameters schema version no supported runtime writes', 'midnight:ledger-parameters[v7]'],
    ['a foreign namespace', 'notmidnight:ledger-parameters[v8]']
  ])('refuses %s', (_label, tag) => {
    expect(() => ledgerParametersEnvelopeVersion(envelope(tag))).toThrow(TagParseError);
  });

  it('never echoes the observed tag, which is attacker-controlled', () => {
    const hostile = 'midnight:ledger-parameters[v99-INJECTED]';

    try {
      ledgerParametersEnvelopeVersion(envelope(hostile));
      expect.unreachable('an unsupported envelope must be refused');
    } catch (error) {
      expect(error).toBeInstanceOf(TagParseError);
      expect((error as TagParseError).message).not.toContain('INJECTED');
    }
  });

  it('refuses a payload with no tag prefix at all', () => {
    expect(() => ledgerParametersEnvelopeVersion(Uint8Array.from([0x00, 0x01, 0x02]))).toThrow(TagParseError);
  });
});
