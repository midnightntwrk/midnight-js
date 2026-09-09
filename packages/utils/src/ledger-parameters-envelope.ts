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
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { parseSerializedTag, TagParseError } from './serialized-tag';

// Serialized ledger parameters carry a `midnight:ledger-parameters[vN]` envelope tag, where the
// bracketed number is the PARAMETER SCHEMA version and NOT the ledger era: the v8 ledger writes
// `[v5]` and the v9 ledger writes `[v8]`. The numbering is per payload family and the families
// collide -- `[v5]` is also what both eras write for a zswap ledger state, and `[v6]` is a contract
// state from the v8 ledger. So never derive an era from a `[vN]` by arithmetic or by analogy with
// another family's table, and never add an entry here by extrapolating the pattern.
//
// DO NOT COPY THIS TABLE. It decides which era's decoder is handed network-supplied bytes, so a
// copy that drifts is a security-relevant divergence -- see
// `packages/protocol/docs/shared-table-discipline.md`.
//
// The runtimes' actual output is pinned by an era-crossing test rather than assumed here; see
// `docs/architecture/era-tagged-payload-decoders.md`, which names the file.
//
// Keyed by ERA and searched, rather than keyed by tag and indexed, for the reason its
// contract-state sibling is: the lookup key is network-supplied, and a tag-keyed object literal
// resolves an unexpected key through `Object.prototype`. Turning the lookup around removes that
// reachability rather than guarding it, and `satisfies` then makes a new `LedgerVersion` with no
// tag here a BUILD failure instead of a refusal at the fork.
const LEDGER_PARAMETERS_TAG_BY_ERA = {
  v8: 'midnight:ledger-parameters[v5]',
  v9: 'midnight:ledger-parameters[v8]'
} as const satisfies Record<LedgerVersion, string>;

/**
 * Reads which ledger runtime wrote a serialized set of ledger parameters, from the envelope tag in
 * front of the body — without deserializing the body.
 *
 * The sibling of {@link contractStateEnvelopeVersion}, and it exists for the same reason: the
 * indexer serves ledger parameters PER BLOCK, they are era-tagged, and each era's deserializer
 * refuses the other era's bytes on the header tag. A reader that decodes them with a fixed era's
 * runtime therefore works on one side of a fork and fails on the other — with a raw deserialization
 * failure that names neither the era nor the field.
 *
 * The tag is network-supplied input and is never the authority on the body; the node remains the
 * sole authority on what the bytes decode to. What this check buys is a cheap, early rejection of
 * anything that is not a parameter set from a supported runtime, before those bytes reach a
 * decoder — and, for a caller that holds two runtimes, the answer to which one to hand them to.
 *
 * Supported public API, deliberately: a caller refused a pre-fork block's parameters by an era-fixed
 * read path has to decode them itself, and needs this to pick the runtime to decode them with.
 *
 * @param raw The serialized ledger-parameters envelope, as the network returned it.
 * @returns The ledger era whose runtime wrote `raw`.
 * @throws TagParseError when there is no well-formed `namespace:version:` tag prefix in the first
 * 64 bytes, or when the tag is not one of the supported ledger-parameters envelopes.
 */
export const ledgerParametersEnvelopeVersion = (raw: Uint8Array): LedgerVersion => {
  const { tag } = parseSerializedTag(raw);
  const ledgerVersion = LEDGER_VERSIONS.find((era) => LEDGER_PARAMETERS_TAG_BY_ERA[era] === tag);
  if (ledgerVersion === undefined) {
    // Never echo the observed tag: it is network-supplied and validated only against a character
    // set, so embedding it verbatim puts arbitrary text into this message.
    throw new TagParseError(
      'The serialized value does not carry a ledger-parameters envelope from a supported ledger runtime. ' +
        'Verify the payload came from the `ledgerParameters` field of a block and not from another serialized type.'
    );
  }
  return ledgerVersion;
};
