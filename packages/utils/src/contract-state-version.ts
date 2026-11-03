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

// The `./version` leaf subpath, not the package root: the root barrel re-exports the
// ledger/compact-js/onchain-runtime namespaces, which every `utils` consumer would then pull in.
import { LEDGER_STATE_TAGS, LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { parseSerializedTag, TagParseError } from './serialized-tag';

// The tags are `LEDGER_STATE_TAGS` from `protocol`, the one table every package reads. The lookup is
// keyed by era and searched, never keyed by the network-supplied tag, so an unexpected tag cannot
// resolve through `Object.prototype`.

/**
 * Reads which ledger runtime wrote a serialized contract state, from the version tag in front of
 * the state body — without deserializing the body.
 *
 * The tag is attacker-controlled input and is never the authority on the body; the node remains the
 * sole authority on what the bytes decode to. What this check buys is a cheap, early rejection of
 * anything that is not a contract state from a supported runtime, before those bytes reach a
 * decoder — and, for a caller that holds two runtimes, the answer to which one to hand them to.
 *
 * Supported public API, deliberately: a caller reading raw contract state from an indexer needs to
 * know which era's decoder to hand the bytes to before it hands them over.
 *
 * @param raw The serialized contract state, as the network returned it.
 * @returns The ledger era whose runtime wrote `raw`.
 * @throws TagParseError when there is no well-formed `namespace:version:` tag prefix in the first
 * 64 bytes, or when the tag is not one of the supported contract-state version tags.
 */
export const ledgerVersionOfContractState = (raw: Uint8Array): LedgerVersion => {
  const { tag } = parseSerializedTag(raw);
  const ledgerVersion = LEDGER_VERSIONS.find((era) => LEDGER_STATE_TAGS.ContractState[era] === tag);
  if (ledgerVersion === undefined) {
    // Never echo the observed tag: it is attacker-controlled and validated only against a
    // character set, so embedding it verbatim puts arbitrary text into this message.
    throw new TagParseError(
      'The serialized state does not start with a contract-state version tag from a supported ledger runtime. ' +
        'Verify the payload came from a contract-state query and not from another serialized type.'
    );
  }
  return ledgerVersion;
};
