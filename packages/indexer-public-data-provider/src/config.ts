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

/**
 * Parses the indexer query and subscription URLs and verifies their protocol
 * schemes. Validation order matches the original monolithic factory:
 * queryURL parse → queryURL scheme → subscriptionURL parse → subscriptionURL scheme.
 * After both URLs are valid, each is passed through {@link warnIfInsecureRemoteUrl}.
 *
 * Returns nothing — Phase 2 introduces a `ValidatedConfig` shape that carries
 * the parsed `URL` objects forward; in this phase the original raw strings
 * continue to flow through to `createApolloClient`.
 *
 * @throws `TypeError` from `new URL(...)` on malformed URLs.
 * @throws {@link InvalidProtocolSchemeError} on an unsupported scheme.
 */
export const validateAndWarnUrls = (queryURL: string, subscriptionURL: string): void => {
  const queryURLObj = new URL(queryURL);

  if (queryURLObj.protocol !== 'http:' && queryURLObj.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(queryURLObj.protocol, ['http:', 'https:']);
  }
  const subscriptionURLObj = new URL(subscriptionURL);

  if (subscriptionURLObj.protocol !== 'ws:' && subscriptionURLObj.protocol !== 'wss:') {
    throw new InvalidProtocolSchemeError(subscriptionURLObj.protocol, ['ws:', 'wss:']);
  }
  warnIfInsecureRemoteUrl(queryURL, 'indexer query URL');
  warnIfInsecureRemoteUrl(subscriptionURL, 'indexer subscription URL');
};
