/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { Either } from 'effect';
import * as Brand from 'effect/Brand';

import { InvalidProtocolError } from './errors';

export type HttpUrl = Brand.Branded<URL, 'HttpURL'>;

export const HttpURL = Brand.refined<HttpUrl>(
  (url) => url.protocol === 'http:' || url.protocol === 'https:',
  (url) => Brand.error(`Invalid protocol scheme '${url.protocol}'. Expected 'http:' or 'https:'`)
);

export const make = (url: URL | string): Either.Either<HttpUrl, InvalidProtocolError> => {
  const targetURL = typeof url === 'string' ? new URL(url) : url;
  try {
    return Either.right(HttpURL(targetURL));
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (err: unknown) {
    return Either.left(
      new InvalidProtocolError({
        protocol: targetURL.protocol,
        allowed: ['http:', 'https:']
      })
    );
  }
};
