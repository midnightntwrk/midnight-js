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

import { InvalidProtocolSchemeError } from '@midnight-ntwrk/midnight-js-types';
import { warnIfInsecureRemoteUrl } from '@midnight-ntwrk/midnight-js-utils';
// Default import, not `import * as ws` + `ws.WebSocket`: isomorphic-ws is CJS
// (`module.exports = require('ws')`) with no `exports` map. Node's CJS→ESM interop
// exposes only the `default` export to the built `.mjs`, so the named `ws.WebSocket`
// resolves to `undefined` at runtime under ESM (it works only in the CJS build).
// The default export is the WebSocket class in both formats.
import WebSocket from 'isomorphic-ws';

import { IndexerProviderConfigError } from './errors';

/** Default polling interval (milliseconds) for paths that still rely on Apollo `watchQuery` polling. */
export const DEFAULT_POLL_INTERVAL = 1000;

/**
 * Default page size for {@link PublicDataProvider.queryContractEvents} when the
 * caller omits `page.limit`. Applied explicitly by the provider so the page
 * size is documented and stable, never an undocumented server default.
 */
export const DEFAULT_CONTRACT_EVENTS_PAGE_SIZE = 100;

/**
 * User-facing configuration for the indexer public data provider.
 * All fields except the URLs are optional; defaults are filled in by
 * {@link validateConfig}.
 */
export type IndexerProviderConfig = {
  readonly queryURL: string;
  readonly subscriptionURL: string;
  readonly webSocket?: typeof WebSocket;
  /** Defaults to {@link DEFAULT_POLL_INTERVAL}. Must be a positive integer. */
  readonly pollInterval?: number;
};

/**
 * Result of {@link validateConfig}: parsed URLs and resolved defaults.
 * The raw `*URLString` fields carry the caller-supplied string verbatim
 * (no normalization). `transport.ts` uses the raw strings when constructing
 * Apollo's `HttpLink` and the `graphql-ws` client so that path/case-sensitive
 * proxies see exactly what the caller intended.
 */
export type ValidatedConfig = {
  readonly queryURL: URL;
  readonly subscriptionURL: URL;
  readonly queryURLString: string;
  readonly subscriptionURLString: string;
  readonly webSocket: typeof WebSocket;
  readonly pollInterval: number;
};

const resolvePollInterval = (value: number | undefined): number => {
  if (value === undefined) return DEFAULT_POLL_INTERVAL;
  if (!Number.isInteger(value) || value <= 0) {
    throw new IndexerProviderConfigError(
      `pollInterval must be a positive integer (milliseconds); received ${value}`
    );
  }
  return value;
};

/**
 * Parses and validates an {@link IndexerProviderConfig}.
 *
 * Validation order matches the original monolithic factory:
 * queryURL parse → queryURL scheme → subscriptionURL parse → subscriptionURL scheme.
 * After both URLs are valid, each is passed through {@link warnIfInsecureRemoteUrl}.
 *
 * `pollInterval`, if supplied, must be a positive integer; non-positive
 * values, `NaN`, `Infinity`, and fractions are rejected fail-fast.
 *
 * @throws `TypeError` from `new URL(...)` on malformed URLs.
 * @throws {@link InvalidProtocolSchemeError} on an unsupported scheme.
 * @throws {@link IndexerProviderConfigError} on an invalid `pollInterval`.
 */
export const validateConfig = (config: IndexerProviderConfig): ValidatedConfig => {
  const queryURLObj = new URL(config.queryURL);

  if (queryURLObj.protocol !== 'http:' && queryURLObj.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(queryURLObj.protocol, ['http:', 'https:']);
  }
  const subscriptionURLObj = new URL(config.subscriptionURL);

  if (subscriptionURLObj.protocol !== 'ws:' && subscriptionURLObj.protocol !== 'wss:') {
    throw new InvalidProtocolSchemeError(subscriptionURLObj.protocol, ['ws:', 'wss:']);
  }
  warnIfInsecureRemoteUrl(config.queryURL, 'indexer query URL');
  warnIfInsecureRemoteUrl(config.subscriptionURL, 'indexer subscription URL');

  const pollInterval = resolvePollInterval(config.pollInterval);

  return {
    queryURL: queryURLObj,
    subscriptionURL: subscriptionURLObj,
    queryURLString: config.queryURL,
    subscriptionURLString: config.subscriptionURL,
    webSocket: config.webSocket ?? WebSocket,
    pollInterval
  };
};
