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

/**
 * Resolves an endpoint URL by appending a path to the base URL's pathname,
 * correctly preserving any existing path segments in the base URL.
 *
 * @param base - The base URL string (e.g. 'https://example.com/api/v1/')
 * @param path - The path to append (e.g. '/check')
 * @returns A URL object with the resolved endpoint
 *
 * @example
 * resolveEndpointUrl('https://example.com/api/', '/check')
 * // => URL { href: 'https://example.com/api/check' }
 */
export const resolveEndpointUrl = (base: string, path: string): URL => {
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/+$/, '') + path;
  return url;
};
