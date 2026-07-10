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

import type * as ws from 'isomorphic-ws';
import { describe, expect, test } from 'vitest';

import { DEFAULT_POLL_INTERVAL, validateConfig } from '../config';
import { IndexerProviderConfigError } from '../errors';

const queryURL = 'http://localhost:4000/api/v1/graphql';
const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';

describe('validateConfig — URL validation', () => {
  test('throws on malformed queryURL', () => {
    expect(() => validateConfig({ queryURL: 'invalid-url', subscriptionURL })).toThrow('Invalid URL');
  });

  test('throws on malformed subscriptionURL', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL: 'invalid-url' })).toThrow('Invalid URL');
  });

  test('throws on queryURL with ws scheme', () => {
    expect(() => validateConfig({ queryURL: subscriptionURL, subscriptionURL })).toThrow(
      "Invalid protocol scheme: 'ws:'. Allowable schemes are one of: http:,https:"
    );
  });

  test('throws on subscriptionURL with http scheme', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL: queryURL })).toThrow(
      "Invalid protocol scheme: 'http:'. Allowable schemes are one of: ws:,wss:"
    );
  });

  test('validation order: queryURL parse fails before subscriptionURL parse', () => {
    expect(() => validateConfig({ queryURL: 'bad', subscriptionURL: 'also-bad' })).toThrow('Invalid URL');
  });
});

describe('validateConfig — defaults', () => {
  test('omitting webSocket resolves to a constructor (default WebSocket implementation)', () => {
    const validated = validateConfig({ queryURL, subscriptionURL });

    expect(typeof validated.webSocket).toBe('function');
  });

  test('omitting pollInterval defaults to DEFAULT_POLL_INTERVAL', () => {
    const validated = validateConfig({ queryURL, subscriptionURL });

    expect(validated.pollInterval).toBe(DEFAULT_POLL_INTERVAL);
  });

  test('returned URLs are parsed URL objects', () => {
    const validated = validateConfig({ queryURL, subscriptionURL });

    expect(validated.queryURL).toBeInstanceOf(URL);
    expect(validated.subscriptionURL).toBeInstanceOf(URL);
    expect(validated.queryURL.protocol).toBe('http:');
    expect(validated.subscriptionURL.protocol).toBe('ws:');
  });
});

describe('validateConfig — custom values', () => {
  test('custom webSocket implementation is carried through', () => {
    class CustomWS {}
    const validated = validateConfig({
      queryURL,
      subscriptionURL,
      webSocket: CustomWS as unknown as typeof ws.WebSocket
    });

    expect(validated.webSocket).toBe(CustomWS);
  });

  test('custom pollInterval is carried through', () => {
    const validated = validateConfig({ queryURL, subscriptionURL, pollInterval: 5000 });

    expect(validated.pollInterval).toBe(5000);
  });
});

describe('validateConfig — pollInterval fail-fast validation', () => {
  test('throws IndexerProviderConfigError on zero', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: 0 })).toThrow(
      IndexerProviderConfigError
    );
  });

  test('throws IndexerProviderConfigError on negative', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: -1 })).toThrow(
      IndexerProviderConfigError
    );
  });

  test('throws IndexerProviderConfigError on NaN', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: NaN })).toThrow(
      IndexerProviderConfigError
    );
  });

  test('throws IndexerProviderConfigError on Infinity', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: Infinity })).toThrow(
      IndexerProviderConfigError
    );
  });

  test('throws IndexerProviderConfigError on non-integer (fractional)', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: 12.5 })).toThrow(
      IndexerProviderConfigError
    );
  });

  test('error message mentions the offending value', () => {
    expect(() => validateConfig({ queryURL, subscriptionURL, pollInterval: -1 })).toThrow(/-1/);
  });
});
