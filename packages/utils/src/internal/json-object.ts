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

/**
 * Whether a `JSON.parse` result is a JSON OBJECT, as opposed to an array or `null`.
 *
 * Arrays are excluded deliberately. `typeof [] === 'object'` and `[] !== null`, so a naive check
 * admits them, and a parser that admits an array then reports it as an object missing its members
 * -- which sends a caller to fix a document that is not the one they served.
 *
 * Not exported from the package barrel: it is shared between this package's own parsers, not part
 * of the published surface.
 */
export const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
