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

import { LEDGER_VERSIONS, protocolVersionToLedger, UnknownProtocolVersionError } from '../version';

const MAX_ERROR_MESSAGE_LENGTH = 256;

const EXPECTED_SUPPORTED_RANGES = [
  { min: 22_000, max: 23_000, version: 'v8' },
  { min: 1_000_000, max: 2_000_000, version: 'v8' },
  { min: 2_000_000, max: 3_000_000, version: 'v9' }
];

const expectProtocolVersionError = (act: () => unknown): UnknownProtocolVersionError => {
  try {
    act();
  } catch (error) {
    if (error instanceof UnknownProtocolVersionError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a protocol version error to be thrown');
};

describe('protocolVersionToLedger', () => {
  it.each([
    [22_000, 'v8'],
    [22_999, 'v8'],
    [1_000_000, 'v8'],
    [1_005_000, 'v8'],
    [1_999_999, 'v8'],
    [2_000_000, 'v9'],
    [2_002_000, 'v9'],
    [2_999_999, 'v9']
  ])('maps attested protocolVersion %d to %s (unseen minors never error)', (protocolVersion, expected) => {
    expect(protocolVersionToLedger(protocolVersion)).toBe(expected);
  });

  it.each([0, 21_999, 23_000, 999_999, 3_000_000, Number.MAX_SAFE_INTEGER, -1])(
    'throws UnknownProtocolVersionError for unattested integer %d',
    (protocolVersion) => {
      expect(() => protocolVersionToLedger(protocolVersion)).toThrow(UnknownProtocolVersionError);
    }
  );

  it.each([Number.NaN, 2_000_000.5, Number.POSITIVE_INFINITY])(
    'throws UnknownProtocolVersionError for malformed number %d without coercion or rounding',
    (protocolVersion) => {
      expect(() => protocolVersionToLedger(protocolVersion)).toThrow(UnknownProtocolVersionError);
    }
  );

  it.each([
    ['string', '2500000'],
    ['null', null],
    ['undefined', undefined]
  ])('throws UnknownProtocolVersionError for adversarial non-number input (%s)', (_label, adversarial) => {
    // @ts-expect-error — adversarial runtime input, signature is number
    expect(() => protocolVersionToLedger(adversarial)).toThrow(UnknownProtocolVersionError);
  });

  it('carries the observed int, stable code and structured supported ranges', () => {
    const error = expectProtocolVersionError(() => protocolVersionToLedger(23_000));
    expect(error.code).toBe('UNKNOWN_PROTOCOL_VERSION');
    expect(error.protocolVersion).toBe(23_000);
    expect(error.supportedRanges).toEqual(EXPECTED_SUPPORTED_RANGES);
  });

  it('renders a diagnosable message: observed int, every range boundary, remediation', () => {
    const error = expectProtocolVersionError(() => protocolVersionToLedger(23_000));
    expect(error.message).toContain('23000');
    expect(error.message).toContain('22000');
    expect(error.message).toContain('1000000');
    expect(error.message).toContain('2000000');
    expect(error.message).toContain('3000000');
    expect(error.message).toContain('upgrade midnight-js');
  });

  it('sanitises adversarial non-number input: capped, control-char-free message, undefined field', () => {
    const adversarial = `\u001b[31mforged\nlog line${'A'.repeat(4_000_000)}`;
    // @ts-expect-error — adversarial runtime input, signature is number
    const error = expectProtocolVersionError(() => protocolVersionToLedger(adversarial));
    expect(error.message.length).toBeLessThan(MAX_ERROR_MESSAGE_LENGTH);
    // eslint-disable-next-line no-control-regex
    expect(error.message).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(error.protocolVersion).toBeUndefined();
  });
});

describe('runtime immutability', () => {
  it('pins the LEDGER_VERSIONS value', () => {
    expect(LEDGER_VERSIONS).toEqual(['v8', 'v9']);
  });

  it('rejects mutation of LEDGER_VERSIONS', () => {
    expect(() => {
      // @ts-expect-error — mutation must fail at compile time and at runtime
      LEDGER_VERSIONS.push('v10');
    }).toThrow(TypeError);
  });

  it('rejects mutation of a caught error supportedRanges array and its range objects', () => {
    const error = expectProtocolVersionError(() => protocolVersionToLedger(0));
    expect(() => {
      // @ts-expect-error — mutation must fail at compile time and at runtime
      error.supportedRanges.push({ min: 0, max: 1, version: 'v8' });
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error — mutation must fail at compile time and at runtime
      error.supportedRanges[0].version = 'v9';
    }).toThrow(TypeError);
  });
});