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
// binary body (e.g. `midnight:v8:<bytes>`). This tag is a defence-in-depth
// discriminant only: it is attacker-controlled input, never an authority on
// the decoded body — the node re-validates the body itself regardless of
// what this prefix claims.
const MAX_TAG_PREFIX_BYTES = 64;
const COLON = 0x3a;
const SEGMENT_PATTERN = /^[a-z0-9_-]+$/i;

const DEFENCE_IN_DEPTH_NOTE =
  'The tag is a defence-in-depth discriminant only — it is attacker-controlled ' +
  'input and is never the authority on the body; the node remains the sole authority on the decoded body.';

const NEXT_STEP_NOTE =
  "Expected a '<namespace>:<version>:' prefix — verify the payload came from a sanctioned serialization seam " +
  '(wallet balance response, proof request, or raw contract-state query).';

export class TagParseError extends Error {
  readonly code = UTILS_ERROR_CODES.TAG_PARSE_FAILED;

  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
    this.name = 'TagParseError';
  }
}

/**
 * Result of {@link parseSerializedTag}. `namespace` and `version` are the two
 * segments of the `namespace:version:` prefix; `tag` is their `:`-joined
 * form, kept for convenience where callers just want the whole prefix.
 * `body` is an independent copy of the bytes following the prefix — it does
 * not alias the input buffer.
 */
export interface ParsedSerializedTag {
  readonly namespace: string;
  readonly version: string;
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

const malformedTagError = (detail: string): TagParseError =>
  new TagParseError(`${detail} ${DEFENCE_IN_DEPTH_NOTE} ${NEXT_STEP_NOTE}`);

/**
 * Parses the `namespace:version:` prefix off the front of a serialized
 * value's raw bytes.
 *
 * Only the first {@link MAX_TAG_PREFIX_BYTES} (64) bytes are ever scanned —
 * this throws {@link TagParseError} without reading further into the buffer
 * if no well-formed prefix is found there, so an attacker cannot force a
 * full-buffer scan by omitting the tag. Both `namespace` and `version` must
 * be non-empty and match `/^[a-z0-9_-]+$/i`; anything else (including
 * control characters, which could otherwise be used to inject fake log
 * lines) throws {@link TagParseError}. `body` is a `.slice()` copy, so it is
 * isolated from the input buffer the caller passed in.
 */
export const parseSerializedTag = (bytes: Uint8Array): ParsedSerializedTag => {
  const secondColonIndex = findSecondColon(bytes);
  if (secondColonIndex === -1) {
    throw malformedTagError(
      `Unable to locate a well-formed 'namespace:version:' tag prefix within the first ${MAX_TAG_PREFIX_BYTES} bytes.`
    );
  }

  let prefixText: string;
  try {
    prefixText = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, secondColonIndex));
  } catch (cause) {
    throw new TagParseError(`Tag prefix is not valid UTF-8. ${DEFENCE_IN_DEPTH_NOTE} ${NEXT_STEP_NOTE}`, { cause });
  }

  const firstColonIndex = prefixText.indexOf(':');
  const namespace = prefixText.slice(0, firstColonIndex);
  const version = prefixText.slice(firstColonIndex + 1);

  if (!SEGMENT_PATTERN.test(namespace) || !SEGMENT_PATTERN.test(version)) {
    // Deliberately does not echo the raw namespace/version text back into the
    // message: they are attacker-controlled and unvalidated at this point, so
    // embedding them verbatim would let a crafted tag inject arbitrary
    // content (e.g. control characters, fake log lines) into this error's
    // message — the exact risk this validation exists to close off.
    throw malformedTagError(
      "Malformed 'namespace:version:' tag prefix — namespace and version must each be non-empty and match " +
        '/^[a-z0-9_-]+$/i.'
    );
  }

  return {
    namespace,
    version,
    tag: `${namespace}:${version}`,
    body: bytes.subarray(secondColonIndex + 1).slice()
  };
};
