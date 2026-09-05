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
 * The retained-era half of the `proveTx` seam, shared by every
 * {@link ProofProvider} implementation that serves both eras.
 *
 * It lives here, rather than in either provider package, because both of them
 * need exactly this body and neither may own it: `http-client-proof-provider`
 * and `dapp-connector-proof-provider` do not depend on one another, and the
 * retained runtime must not be reached from more than one place.
 *
 * @see docs/adr/0006-version-tagged-payloads-at-provider-seams.md
 * @see docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md
 */

import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { PROVIDER_ERROR_CODES } from './error-codes';

/**
 * The opening of the tag every serialized ledger transaction carries, on both
 * eras.
 *
 * Deliberately stops before the bracketed version. A `[vN]` is the wire-schema
 * version of the serialized OBJECT and never a ledger era — the retained era's
 * transactions are tagged `transaction[v9]` — so matching on it would encode a
 * confusion this repo has already had to correct once, and would break on a
 * vendor bump that revises the schema without changing the era.
 *
 * @see packages/contracts/src/internal/verifier-key.ts for the same rule stated
 *      about verifier-key tags.
 */
const TRANSACTION_TAG_PREFIX = 'midnight:transaction[';

const TRANSACTION_TAG_PREFIX_BYTES = Uint8Array.from(TRANSACTION_TAG_PREFIX, (character) =>
  character.charCodeAt(0)
);

/**
 * The longest constructor name reported by {@link describeType}, and the only
 * characters it may contain.
 *
 * Both bounds exist because a constructor name is CALLER DATA for a plain
 * object — `{ constructor: { name: ... } }` sets it to anything at all. Left
 * unbounded it would carry arbitrary text, newlines included, into an error
 * message and from there into whatever the logger provider receives. Bounding
 * the length and the alphabet leaves it useful as a diagnostic while making it
 * useless as an injection channel.
 */
const MAX_TYPE_NAME_LENGTH = 32;
const TYPE_NAME_PATTERN = /^[A-Za-z0-9_$]+$/;

/**
 * Names the kind of a value without reproducing any of it verbatim.
 *
 * The value reaching this is attacker-controlled. `typeof` and `null` are a
 * closed vocabulary and safe to report as they are; a constructor name is not,
 * so it is truncated first and then reported only if what remains is a plain
 * identifier. Anything else falls back to `'object'` — the description is
 * always either a fixed word or at most {@link MAX_TYPE_NAME_LENGTH} identifier
 * characters.
 *
 * Validated AFTER truncation on purpose: what is checked has to be exactly what
 * is emitted, or a name whose disallowed characters sit past the cut would pass
 * a check on the full string and still be printed.
 */
const describeType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return typeof value;
  }
  const constructorName: unknown = value.constructor?.name;
  if (typeof constructorName !== 'string') {
    return 'object';
  }
  const bounded = constructorName.slice(0, MAX_TYPE_NAME_LENGTH);
  return TYPE_NAME_PATTERN.test(bounded) ? bounded : 'object';
};

/**
 * Thrown when a payload handed to a proving seam is not a serialized
 * transaction at all.
 *
 * Distinct from a decode failure on the way through the ledger runtime: this
 * one is raised before any runtime is asked to read the bytes, so it says the
 * caller sent the wrong KIND of payload rather than a damaged one. It covers
 * both ways that can happen — a `txBytes` field that is not a byte string, and
 * a byte string that is not a transaction.
 */
export class PayloadNotATransactionError extends Error {
  readonly code = PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION;

  private constructor(detail: string) {
    super(
      `${detail} Pass the bytes produced by a sanctioned composition seam; a contract state, a ` +
        'Zswap offer or a proof preimage is not a transaction and cannot be proved.'
    );
    this.name = 'PayloadNotATransactionError';
  }

  /**
   * The `txBytes` field of a `v8` payload was not a `Uint8Array`.
   *
   * Reachable the same way an untagged payload is — from JavaScript, from a
   * consumer built against a pre-5.0.0 `midnight-js-types`, or across an
   * untyped boundary — so it is refused with a code rather than left to become
   * a bare `TypeError` on the first property read.
   */
  static notBytes(received: unknown): PayloadNotATransactionError {
    return new PayloadNotATransactionError(
      `Refusing to prove a v8 payload whose 'txBytes' is ${describeType(received)} rather than a Uint8Array.`
    );
  }

  /** The payload is a byte string, but does not open with a transaction's tag. */
  static wrongTag(byteLength: number): PayloadNotATransactionError {
    return new PayloadNotATransactionError(
      `Refusing to prove a ${byteLength}-byte payload that does not begin with the ` +
        `'${TRANSACTION_TAG_PREFIX}' tag of a serialized ledger transaction.`
    );
  }
}

/**
 * Refuses a payload that does not open with a serialized transaction's tag.
 *
 * Defence in depth, and bounded on purpose. What it establishes is that the
 * bytes are a serialized TRANSACTION; what it deliberately does not establish
 * is which era wrote them, because both eras' tags open identically. The era
 * is carried by the `version` discriminant of the payload the seam received,
 * which is this framework's own field rather than a vendor serialization
 * detail, and the runtime re-validates the full tag when it deserializes.
 *
 * Compared byte-wise rather than by decoding a prefix to text: the input is
 * attacker-controlled at this seam, and nothing is served by turning it into a
 * string that could then reach a log or an error message.
 *
 * @param txBytes The payload to check.
 * @throws PayloadNotATransactionError If the payload is not a `Uint8Array`, is
 *   shorter than the tag prefix, or does not begin with it.
 */
const assertSerializedTransaction = (txBytes: Uint8Array): void => {
  // Widened rather than cast: the declared type says `Uint8Array`, but this is
  // the seam an untyped caller reaches, and reading `.byteLength` off whatever
  // actually arrived would raise a bare `TypeError` carrying no code. Checking
  // the field is the same hardening the version tag already gets one level up.
  const payload: unknown = txBytes;
  if (!(payload instanceof Uint8Array)) {
    throw PayloadNotATransactionError.notBytes(payload);
  }
  const matchesPrefix =
    payload.byteLength >= TRANSACTION_TAG_PREFIX_BYTES.length &&
    TRANSACTION_TAG_PREFIX_BYTES.every((byte, index) => payload[index] === byte);
  if (!matchesPrefix) {
    throw PayloadNotATransactionError.wrongTag(payload.byteLength);
  }
};

/**
 * Proves a retained-era transaction, taking serialized bytes and returning
 * serialized bytes.
 *
 * Bytes on both sides is the seam's contract, not an implementation detail of
 * this function: a retained-era transaction cannot cross a provider boundary as
 * a live object, because the runtime that owns it is loaded lazily and its
 * instances are not interchangeable with the current era's. Inside, the bytes
 * necessarily become an object — the proof-server protocol is per-CIRCUIT, and
 * it is the transaction that drives `provingProvider` one circuit at a time
 * from within `prove()`.
 *
 * The cost model comes from the same {@link loadLedger8} result as the
 * transaction class, and that pairing is load-bearing. The retained ledger
 * ships its own `CostModel`, and its `prove()` checks the argument against that
 * class across the WASM boundary: the current era's cost model is rejected with
 * `expected instance of CostModel`. Nothing here may accept a cost model from a
 * caller, because a caller has no sanctioned way to construct a retained-era
 * one.
 *
 * @param txBytes The serialized, unproven retained-era transaction.
 * @param provingProvider The circuit-level proving provider to drive. The
 *   current era's `ProvingProvider` shape satisfies the retained runtime's
 *   structurally — it declares the same `check` and `prove` and one member more
 *   — so the two providers need no adapter between them.
 * @returns The serialized, proven transaction.
 * @throws PayloadNotATransactionError If `txBytes` is not a serialized
 *   transaction.
 * @throws Ledger8RuntimeMissingError If the retained runtime cannot be loaded.
 */
export const proveV8Transaction = async (
  txBytes: Uint8Array,
  provingProvider: ProvingProvider
): Promise<Uint8Array> => {
  assertSerializedTransaction(txBytes);
  const v8 = await loadLedger8();
  const unproven = v8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', txBytes);
  const proven = await unproven.prove(provingProvider, v8.CostModel.initialCostModel());
  return proven.serialize();
};
