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
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { parseSerializedTag, TagParseError } from './serialized-tag';

// A serialized contract state carries a `midnight:contract-state[vN]:` envelope tag, where the
// bracketed number is the STATE FORMAT version and NOT the ledger era: the v8 ledger writes `[v6]`
// and the v9 ledger writes `[v8]`. The two numbers are unrelated, and the same payload family
// carries a third, different `[vN]` for transactions -- so never derive an era from a `[vN]` by
// arithmetic, and never add an entry here by extrapolating the pattern.
//
// DO NOT COPY THIS TABLE. It decides which era's decoder is handed attacker-supplied bytes, so a
// copy that drifts is a security-relevant divergence -- see
// `packages/protocol/docs/shared-table-discipline.md`.
//
// Both entries are pinned against what the runtimes actually WRITE, by
// `packages/indexer-public-data-provider/src/test/raw-contract-state.test.ts`, which is where the
// two ledger runtimes are available as devDependencies.
const CONTRACT_STATE_TAG_TO_LEDGER_VERSION: Readonly<Partial<Record<string, LedgerVersion>>> = Object.freeze({
  'midnight:contract-state[v6]': 'v8',
  'midnight:contract-state[v8]': 'v9'
});

/**
 * Reads which ledger runtime wrote a serialized contract state, from the envelope tag in front of
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
 * @param raw The serialized contract-state envelope, as the network returned it.
 * @returns The ledger era whose runtime wrote `raw`.
 * @throws TagParseError when there is no well-formed `namespace:version:` tag prefix in the first
 * 64 bytes, or when the tag is not one of the supported contract-state envelopes.
 */
export const contractStateEnvelopeVersion = (raw: Uint8Array): LedgerVersion => {
  const { tag } = parseSerializedTag(raw);
  const ledgerVersion = CONTRACT_STATE_TAG_TO_LEDGER_VERSION[tag];
  if (ledgerVersion === undefined) {
    // Never echo the observed tag: it is attacker-controlled and validated only against a
    // character set, so embedding it verbatim puts arbitrary text into this message.
    throw new TagParseError(
      'The serialized state does not carry a contract-state envelope from a supported ledger runtime. ' +
        'Verify the payload came from a contract-state query and not from another serialized type.'
    );
  }
  return ledgerVersion;
};
