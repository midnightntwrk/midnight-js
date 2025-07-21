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

import {
  type Binding,
  type Bindingish,
  type PreProof,
  type Proof,
  type SignatureEnabled,
  type Signaturish,
  type Transaction,
  type TransactionHash,
  type TransactionId, type ZswapInput, type ZswapOffer, type ZswapOutput, type ZswapTransient
} from '@midnight-ntwrk/ledger';

/**
 * A type representing a transaction that has not been proven yet.
 * It may contain the signature and binding information, but no proof.
 */
export type UnprovenTransaction = Transaction<Signaturish, PreProof, Bindingish>;

/**
 * A type representing a transaction that has not been proven yet,
 */
export type UnprovenInput = ZswapInput<PreProof>;

/**
 * A type representing a transaction output that has not been proven yet.
 */
export type UnprovenOutput = ZswapOutput<PreProof>;

/**
 * A type representing a transaction transient that has not been proven yet.
 */
export type UnprovenTransient = ZswapTransient<PreProof>;

/**
 * A type representing an offer that has not been proven yet.
 */
export type UnprovenOffer = ZswapOffer<PreProof>;

/**
 * A type representing a prover key derived from a contract circuit.
 */
export type ProverKey = Uint8Array & {
  /**
   * Unique symbol brand.
   */
  readonly ProverKey: unique symbol;
};

/**
 * Creates a branded prover key representation from a prover key binary.
 *
 * @param uint8Array The prover key binary.
 */
export const createProverKey = (uint8Array: Uint8Array): ProverKey => {
  return uint8Array as ProverKey;
};

/**
 * A type representing a verifier key derived from a contract circuit.
 */
export type VerifierKey = Uint8Array & {
  /**
   * Unique symbol brand.
   */
  readonly VerifierKey: unique symbol;
};

/**
 * Creates a branded verifier key representation from a verifier key binary.
 *
 * @param uint8Array The verifier key binary.
 */
export const createVerifierKey = (uint8Array: Uint8Array): VerifierKey => {
  return uint8Array as VerifierKey;
};

/**
 * A type representing a zero-knowledge circuit intermediate representation derived from a contract circuit.
 */
export type ZKIR = Uint8Array & {
  /**
   * Unique symbol brand.
   */
  readonly ZKIR: unique symbol;
};

/**
 * Creates a branded ZKIR representation from a ZKIR binary.
 *
 * @param uint8Array The ZKIR binary.
 */
export const createZKIR = (uint8Array: Uint8Array): ZKIR => {
  return uint8Array as ZKIR;
};

/**
 * Contains all information required by the {@link ProofProvider}
 * @typeParam K - The type of the circuit ID.
 */
export interface ZKConfig<K extends string> {
  /**
   * A circuit identifier.
   */
  readonly circuitId: K;
  /**
   * The prover key corresponding to {@link ZKConfig.circuitId}.
   */
  readonly proverKey: ProverKey;
  /**
   * The verifier key corresponding to {@link ZKConfig.circuitId}.
   */
  readonly verifierKey: VerifierKey;
  /**
   * The zero-knowledge intermediate representation corresponding to {@link ZKConfig.circuitId}.
   */
  readonly zkir: ZKIR;
}

/**
 * A type representing a proven, unbalanced transaction.
 */
export type UnbalancedTransaction = Transaction<Signaturish, Proof, Bindingish> & {
  /**
   * Unique symbol brand.
   */
  readonly UnbalancedTransaction: unique symbol;
};

/**
 * Creates an {@link UnbalancedTransaction} from a ledger transaction.
 *
 * @param tx The ledger transaction to wrap.
 */
export const createUnbalancedTx = (tx: Transaction<Signaturish, Proof, Bindingish>): UnbalancedTransaction => {
  return tx as UnbalancedTransaction;
};

/**
 * A type representing a proven, balanced, submittable transaction.
 */
export type BalancedTransaction = Transaction<Signaturish, Proof, Bindingish> & {
  /**
   * Unique symbol brand.
   */
  readonly BalancedTransaction: unique symbol;
};

/**
 * Creates an {@link BalancedTransaction} from a ledger transaction.
 * @param tx The ledger transaction to wrap.
 */
export const createBalancedTx = (tx: Transaction<Signaturish, Proof, Bindingish>): BalancedTransaction => {
  return tx as BalancedTransaction;
};

/**
 * Indicates that the transaction is invalid.
 */
export const FailEntirely = 'FailEntirely' as const;

/**
 * Indicates that the segment update is invalid.
 */
export const SegmentFail = 'SegmentFail' as const;

/**
 * Indicates that the segment is valid.
 */
export const SegmentSuccess = 'SegmentSuccess' as const;

/**
 * Represents the result of a segment operation, which can either be a successful operation
 * (`SegmentSuccess`) or a failed operation (`SegmentFail`).
 */
export type SegmentStatus = typeof SegmentSuccess | typeof SegmentFail;

/**
 * Indicates that the transaction is valid but the portion of the transcript
 * that is allowed to fail (the portion after a checkpoint) did fail. All effects
 * from the guaranteed part of the transaction are kept but the effects from the
 * fallible part of the transaction are discarded.
 */
export const FailFallible = 'FailFallible' as const;

/**
 * Indicates that the guaranteed and fallible portions of the transaction were
 * successful.
 */
export const SucceedEntirely = 'SucceedEntirely' as const;

/**
 * The status of a transaction.
 */
export type TxStatus = typeof FailEntirely | typeof FailFallible | typeof SucceedEntirely;

/**
 * Block identifier
 */
export type BlockHash = string;

/**
 * Data for any finalized transaction.
 */
export interface FinalizedTxData {
  /**
   * The transaction that was finalized.
   */
  readonly tx: Transaction<SignatureEnabled, Proof, Binding>;
  /**
   * The status of a submitted transaction.
   */
  readonly status: TxStatus;
  /**
   * The transaction ID of the submitted transaction.
   */
  readonly txId: TransactionId;
  /**
   * The transaction hash of the transaction in which the original transaction was included.
   */
  readonly txHash: TransactionHash;
  /**
   * The block hash of the block in which the transaction was included.
   */
  readonly blockHash: BlockHash;
  /**
   * The block height of the block in which the transaction was included.
   */
  readonly blockHeight: number;

  /**
   * The map that associates segment identifiers (numbers) with their corresponding status (boolean).
   * The segment identifier is represented as a number (key in the map), and the status is represented as a boolean value.
   * Typically, the boolean status indicates a specific state or condition associated with the segment, such as whether it is active or inactive.
   */
  readonly segmentStatusMap: Map<number, SegmentStatus> | undefined;
}
