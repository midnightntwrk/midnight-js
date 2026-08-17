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

import { UTILS_ERROR_CODES } from './error-codes';

// A serialized value may carry a `namespace:version:` prefix ahead of its
// binary body (e.g. `midnight:v8:<bytes>`). Per spec §6.1 this tag is a
// defence-in-depth discriminant only: it is attacker-controlled input, never
// an authority on the decoded body — the node re-validates the body itself.
const MAX_TAG_PREFIX_BYTES = 64;
const COLON = 0x3a;

const DEFENCE_IN_DEPTH_NOTE =
  'The tag is a defence-in-depth discriminant only (spec §6.1) — it is attacker-controlled ' +
  'input and is never the authority on the body; the node remains the sole authority on the decoded body.';

export class TagParseError extends Error {
  readonly code = UTILS_ERROR_CODES.TAG_PARSE_FAILED;

  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'TagParseError';
  }
}

export interface ParsedSerializedTag {
  readonly tag: string;
  readonly body: Uint8Array;
}

const findSecondColon = (bytes: Uint8Array): number => {
  const scanLimit = Math.min(bytes.length, MAX_TAG_PREFIX_BYTES);
  let colonsSeen = 0;
  for (let i = 0; i < scanLimit; i += 1) {
    if (bytes[i] === COLON) {
      colonsSeen += 1;
      if (colonsSeen === 2) {
        return i;
      }
    }
  }
  return -1;
};

export const parseSerializedTag = (bytes: Uint8Array): ParsedSerializedTag => {
  const secondColonIndex = findSecondColon(bytes);
  if (secondColonIndex === -1) {
    throw new TagParseError(
      `Unable to locate a well-formed 'namespace:version:' tag prefix within the first ` +
        `${MAX_TAG_PREFIX_BYTES} bytes. ${DEFENCE_IN_DEPTH_NOTE}`
    );
  }

  let tag: string;
  try {
    tag = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, secondColonIndex));
  } catch (cause) {
    throw new TagParseError(`Tag prefix is not valid UTF-8. ${DEFENCE_IN_DEPTH_NOTE}`, { cause });
  }

  return { tag, body: bytes.subarray(secondColonIndex + 1) };
};
