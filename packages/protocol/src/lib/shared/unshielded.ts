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

import type { AlignedValue, Transcript, UtxoOutput } from '@midnightntwrk/ledger-v9';

import { ComposeFailedError } from '../../errors';
import type { LedgerVersion } from './ledger-version';

/**
 * The guaranteed/fallible transcript pair one call contributes to a
 * transaction. Both halves are optional: a call whose ops are all guaranteed
 * has no fallible half, and vice versa.
 */
export interface CallTranscriptPair {
  /** The entry point this pair belongs to — named by any failure raised for it. */
  readonly circuitId: string;
  readonly guaranteed?: Transcript<AlignedValue>;
  readonly fallible?: Transcript<AlignedValue>;
}

/**
 * The era module slice {@link aggregateUnshieldedOffers} needs: just the
 * `UnshieldedOffer` constructor.
 *
 * Injected rather than imported, because this function genuinely runs on BOTH
 * eras — the v9 composition arm passes ledger-v9, the v8 leg passes the module
 * it was handed by `loadLedger8`. A value import of either would both pick a
 * side and statically link that era's WASM into whatever bundle reaches this
 * module, which for ledger-v8 is exactly what `dist-laziness.test.ts` forbids.
 *
 * `inputs` and `signatures` are typed `never[]` rather than the ledger's own
 * parameter types: this seam only ever aggregates OUTPUTS, so `[]` is the only
 * value that can be passed, and the type says so instead of a comment.
 */
export interface UnshieldedOfferLedger<TOffer> {
  readonly UnshieldedOffer: {
    readonly new: (inputs: never[], outputs: UtxoOutput[], signatures: never[]) => TOffer;
  };
}

/** The offer for each of a transaction's two segments, absent when that segment pays out nothing. */
export interface AggregatedUnshieldedOffers<TOffer> {
  readonly guaranteed: TOffer | undefined;
  readonly fallible: TOffer | undefined;
}

/**
 * Reads the UTXO outputs a call's transcript claims on behalf of USERS.
 *
 * A contract-addressed claimed spend is skipped: it is settled between
 * contracts and never paid out to a UTXO, so emitting one would add an output
 * the transaction cannot cover.
 *
 * A user-addressed spend this seam cannot pay out is REFUSED, not skipped. That
 * is a different case from a contract-addressed spend, which is not a payout at
 * all: this one is a payout the transaction has no way to make. Dropping it
 * silently composes a transaction that tells the user they were paid and pays
 * them nothing, so it leaves as a coded failure at composition time instead.
 * Two token types reach that refusal — dust, which carries no raw token type to
 * pay out in, and a shielded type, whose value moves through a Zswap offer
 * rather than a UTXO.
 *
 * The check is on the ONE type this seam can pay out rather than on a list of
 * the ones it cannot. `TokenType` is a vendor union, and a shielded type
 * carries a `raw` field exactly as an unshielded one does, so an
 * exclude-what-we-know-about test emits a plausible-looking `UtxoOutput` for
 * everything it has not heard of. A fourth member added by a vendor bump has to
 * fail closed here, not compose a payout nothing can settle.
 *
 * An absent transcript is the normal shape of a call with no fallible half, not
 * an error, so it yields no outputs rather than throwing.
 */
export const extractUserAddressedOutputs = (
  transcript: Transcript<AlignedValue> | undefined,
  version: LedgerVersion,
  circuitId: string
): UtxoOutput[] => {
  if (transcript === undefined) {
    return [];
  }

  const outputs: UtxoOutput[] = [];
  for (const [[tokenType, publicAddress], value] of transcript.effects.claimedUnshieldedSpends) {
    if (publicAddress.tag !== 'user') {
      continue;
    }
    if (tokenType.tag === 'dust') {
      throw new ComposeFailedError(version, 'call-dust-payout', circuitId);
    }
    if (tokenType.tag !== 'unshielded') {
      throw new ComposeFailedError(version, 'call-unsupported-payout', circuitId);
    }
    outputs.push({ value, owner: publicAddress.address, type: tokenType.raw });
  }
  return outputs;
};

/**
 * Builds the one unshielded offer each segment of a transaction carries, from
 * EVERY call in the tree.
 *
 * A user-addressed output can be produced by any call, not just the root, and a
 * transaction has a single guaranteed and a single fallible offer. Assembling
 * either from the root call alone would drop a cross-contract callee's payout
 * and leave the transaction unbalanced — rejected on submission, with nothing
 * having reported a problem at composition time.
 *
 * A segment with nothing to pay out gets no offer at all rather than an empty
 * one: the ledger expects the field left unset, not a declared offer paying out
 * nothing.
 */
export const aggregateUnshieldedOffers = <TOffer>(
  calls: readonly CallTranscriptPair[],
  ledger: UnshieldedOfferLedger<TOffer>,
  version: LedgerVersion
): AggregatedUnshieldedOffers<TOffer> => {
  const guaranteedOutputs = calls.flatMap((call) =>
    extractUserAddressedOutputs(call.guaranteed, version, call.circuitId)
  );
  const fallibleOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.fallible, version, call.circuitId));

  return {
    guaranteed: guaranteedOutputs.length > 0 ? ledger.UnshieldedOffer.new([], guaranteedOutputs, []) : undefined,
    fallible: fallibleOutputs.length > 0 ? ledger.UnshieldedOffer.new([], fallibleOutputs, []) : undefined
  };
};
