/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { getNetworkId,setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type AlignedValue,
  ContractOperation,
  ContractState as CompactContractState,
  createCircuitContext,
  QueryContext,
  type Recipient
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type CoinCommitment,
  coinCommitment,
  type ContractAddress,
  createShieldedCoinInfo,
  feeToken,
  Intent,
  nativeToken,
  type PartitionedTranscript,
  type PublicAddress,
  type QualifiedShieldedCoinInfo,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleUserAddress,
  type ShieldedCoinInfo,
  shieldedToken,
  type TokenType,
  Transaction,
  type Transcript,
  UnshieldedOffer,
  unshieldedToken,
  type UtxoOutput,
  ZswapChainState,
  ZswapInput,
  ZswapOffer,
  ZswapOutput
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as PlatformContractAddress from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/ContractAddress';
import { isDeserializationError, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';
import { Option } from 'effect';
import { readFileSync } from 'fs';
import { beforeAll } from 'vitest';

import {
  createUnprovenLedgerCallTx,
  createZswapOutput,
  type EncryptionPublicKeyResolver,
  extractUserAddressedOutputs,
  fromLedgerContractState,
  toLedgerContractState,
  toLedgerQueryContext,
  ZSWAP_MERKLE_ROOT_RETENTION_SECONDS} from '../../utils';
const emptyTranscript: PartitionedTranscript = [undefined, undefined];

/**
 * A real, serialized verifier key. `createUnprovenLedgerCallTx` hashes each operation's verifier
 * key into the call's key location (see `ZKConfigRegistry`), and the `ContractOperation.verifierKey`
 * setter validates the bytes against the `midnight:verifier-key[v6]:` header — so fixtures cannot
 * use arbitrary bytes. We reuse a committed compiled key; its contents are irrelevant to these
 * tests (only that it is a valid, present key).
 */
const DUMMY_VERIFIER_KEY = new Uint8Array(
  readFileSync(new URL('../resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
);

/**
 * Builds a contract operation carrying a valid verifier key, as every operation reached by
 * `createUnprovenLedgerCallTx` must have one.
 */
const makeOperation = (): ContractOperation => {
  const operation = new ContractOperation();
  operation.verifierKey = DUMMY_VERIFIER_KEY;
  return operation;
};

describe('ledger-utils', () => {
  beforeAll(() => {
    setNetworkId('testnet');
  });

  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyEncPublicKey = sampleEncryptionPublicKey();

  beforeAll(() => {
    setNetworkId('undeployed');
  });

  it('toLedgerContractState and fromLedgerContractState are inverses', () => {
    const ledgerState = toLedgerContractState(dummyContractState);
    const roundTrip = fromLedgerContractState(ledgerState);
    expect(roundTrip.constructor.name).toBe('ContractState');
    expect(roundTrip).toHaveProperty('maintenanceAuthority');
  });

  it('toLedgerQueryContext returns a LedgerQueryContext', () => {
    const queryContext = new QueryContext(dummyContractState.data, dummyContractAddress);
    const ledgerQueryContext = toLedgerQueryContext(queryContext);
    expect(ledgerQueryContext.address).toEqual(queryContext.address);
  });

  it('createUnprovenLedgerCallTx returns an UnprovenTransaction', () => {
    const circuitId = 'unProvenLedgerTx';
    const contractState = dummyContractState;
    const contractOperation = makeOperation();

    contractState.setOperation(circuitId, contractOperation);

    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [
        {
          tag: 'atom',
          value: { tag: 'field' }
        }
      ]
    };

    const contractAddress = sampleContractAddress();
    const zswapChainState = new ZswapChainState();
    const privateTranscriptOutputs: AlignedValue[] = [];
    const nextZswapLocalState = {
      outputs: [],
      inputs: [],
      coinPublicKey: sampleCoinPublicKey(),
      currentIndex: 0n
    };

    const tx = createUnprovenLedgerCallTx(
      [
        {
          contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
          circuitId,
          public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: emptyTranscript },
          private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs },
          communicationCommitment: Option.none()
        }
      ],
      () => contractState,
      zswapChainState,
      nextZswapLocalState,
      dummyEncPublicKey
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenLedgerCallTx throws when circuitId has no registered operation', () => {
    const unregisteredCircuitId = 'unregisteredCircuit';
    const contractState = new CompactContractState();

    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [
        {
          tag: 'atom',
          value: { tag: 'field' }
        }
      ]
    };

    expect(() =>
      createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(sampleContractAddress()),
            circuitId: unregisteredCircuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: emptyTranscript },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        new ZswapChainState(),
        {
          outputs: [],
          inputs: [],
          coinPublicKey: sampleCoinPublicKey(),
          currentIndex: 0n
        },
        dummyEncPublicKey
      )
    ).toThrow(`Operation '${unregisteredCircuitId}' is undefined`);
  });

  describe('createUnprovenLedgerCallTx with receiveShielded (issue #686)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shieldedContract: any;
    let shieldedInitialState: CompactContractState;
    const shieldedAddr = sampleContractAddress();
    const shieldedCpk = sampleCoinPublicKey();

    beforeAll(async () => {
      const mod = await import('../resources/compiled/shielded-map/contract/index.js');
      shieldedContract = new mod.Contract({ dummy: (ctx: { privateState: undefined }) => [ctx.privateState, []] });
      const emptyZswap = { coinPublicKey: shieldedCpk, outputs: [], inputs: [], currentIndex: 0n };
      const initResult = await shieldedContract.initialState({ initialPrivateState: undefined, initialZswapLocalState: emptyZswap });
      shieldedInitialState = initResult.currentContractState;
      const depositOperation = shieldedInitialState.operation('deposit')!;
      depositOperation.verifierKey = DUMMY_VERIFIER_KEY;
      shieldedInitialState.setOperation('deposit', depositOperation);
    });

    it('succeeds with deposit circuit that calls receiveShielded', async () => {
      const coin = { nonce: new Uint8Array(32).fill(1), color: new Uint8Array(32).fill(2), value: 100n };
      const ctx = createCircuitContext('deposit', shieldedAddr, shieldedCpk, shieldedInitialState, undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { context, gasCost } = await (shieldedContract.circuits as any).deposit(ctx, coin);
      // The root circuit completes last, so its proof data is the final entry in the trace.
      const proofData = context.callProofDataTrace[context.callProofDataTrace.length - 1];

      // Build partitioned transcript from the circuit execution
      // The circuit produces publicTranscript ops; we need to wrap them as a guaranteed Transcript
      const transcript: Transcript<AlignedValue> = {
        gas: gasCost,
        effects: context.callContext.currentQueryContext.effects,
        program: proofData.publicTranscript
      };
      const partitioned: PartitionedTranscript = [transcript, undefined];

      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(shieldedAddr),
            circuitId: 'deposit',
            public: { contractState: shieldedInitialState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: {
              input: proofData.input,
              output: proofData.output,
              privateTranscriptOutputs: proofData.privateTranscriptOutputs
            },
            communicationCommitment: Option.none()
          }
        ],
        () => shieldedInitialState,
        new ZswapChainState(),
        { outputs: [], inputs: [], coinPublicKey: shieldedCpk, currentIndex: 0n },
        dummyEncPublicKey
      );
      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('createUnprovenLedgerCallTx shielded segment routing', () => {
    const circuitId = 'addLiquidity';
    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [{ tag: 'atom', value: { tag: 'field' } }]
    };

    const makeTranscript = (
      claimedShieldedReceives: CoinCommitment[] = [],
      claimedShieldedSpends: CoinCommitment[] = [],
      claimedNullifiers: string[] = []
    ): Transcript<AlignedValue> => ({
      gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
      effects: {
        claimedNullifiers,
        claimedShieldedReceives,
        claimedShieldedSpends,
        claimedContractCalls: [],
        shieldedMints: new Map(),
        unshieldedInputs: new Map(),
        unshieldedOutputs: new Map(),
        unshieldedMints: new Map(),
        claimedUnshieldedSpends: new Map()
      },
      program: ['new', { noop: { n: 5 } }]
    });

    const makeTranscriptWithReceives = (claimedShieldedReceives: CoinCommitment[]): Transcript<AlignedValue> =>
      makeTranscript(claimedShieldedReceives);

    const seedContractCoin = (
      coinInfo: ShieldedCoinInfo,
      contractAddress: ContractAddress
    ): { chainState: ZswapChainState; qualifiedCoin: QualifiedShieldedCoinInfo } => {
      const recipient: Recipient = { is_left: false, left: sampleCoinPublicKey(), right: contractAddress };
      const constantResolver: EncryptionPublicKeyResolver = () => sampleEncryptionPublicKey();
      const output = createZswapOutput({ coinInfo, recipient }, constantResolver);
      const seedTx = Transaction.fromParts(
        getNetworkId(),
        ZswapOffer.fromOutput(output, coinInfo.type, coinInfo.value)
      ).eraseProofs();
      const [chainState, mtIndices] = new ZswapChainState().tryApply(seedTx.guaranteedOffer!);
      const qualifiedCoin: QualifiedShieldedCoinInfo = { ...coinInfo, mt_index: mtIndices.get(output.commitment)! };
      return { chainState, qualifiedCoin };
    };

    const probeNullifier = (
      qualifiedCoin: QualifiedShieldedCoinInfo,
      chainState: ZswapChainState,
      contractAddress: ContractAddress
    ): string =>
      ZswapInput.newContractOwned(
        qualifiedCoin,
        0,
        contractAddress,
        chainState.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS)
      ).nullifier;

    it('routes a user-bound shielded output from a fallible op into the fallible Zswap offer', () => {
      // Arrange
      const walletCpk = sampleCoinPublicKey();
      const recipientCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 4967n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscriptWithReceives([]),
        makeTranscriptWithReceives([commitment])
      ];

      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());
      const contractAddress = sampleContractAddress();

      // Act
      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        new ZswapChainState(),
        {
          currentIndex: 0n,
          coinPublicKey: walletCpk,
          inputs: [],
          outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: contractAddress } }]
        },
        () => epk
      );

      // Assert
      const fallible = tx.fallibleOffer;
      expect(fallible).toBeDefined();
      expect(fallible!.size).toBe(1);
      const [[, fallibleOffer]] = Array.from(fallible!.entries());
      expect(fallibleOffer.outputs.map((o) => o.commitment)).toEqual([commitment]);
      expect(tx.guaranteedOffer).toBeUndefined();
    });

    it('keeps a guaranteed-segment user-bound output in the guaranteed offer', () => {
      // Arrange
      const walletCpk = sampleCoinPublicKey();
      const recipientCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscriptWithReceives([commitment]),
        undefined
      ];
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());
      const contractAddress = sampleContractAddress();

      // Act
      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        new ZswapChainState(),
        {
          currentIndex: 0n,
          coinPublicKey: walletCpk,
          inputs: [],
          outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: contractAddress } }]
        },
        () => epk
      );

      // Assert
      expect(tx.guaranteedOffer).toBeDefined();
      expect(tx.guaranteedOffer!.outputs.map((o) => o.commitment)).toEqual([commitment]);
      expect(tx.fallibleOffer).toBeUndefined();
    });

    it('routes a wallet-owned input into the fallible offer when its nullifier is in fallible claimedNullifiers (regression #876)', () => {
      // Arrange — emulates a contract circuit that spends a previously-deposited coin
      // in the fallible segment. Per ledger v8 (construct.rs:148-156), the contract
      // populates claimedNullifiers (not claimedShieldedSpends) with the input's
      // nullifier. The fix must route inputs by nullifier match.
      const walletCpk = sampleCoinPublicKey();
      const contractAddress = sampleContractAddress();
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 500n);
      const { chainState, qualifiedCoin } = seedContractCoin(coinInfo, contractAddress);
      const nullifier = probeNullifier(qualifiedCoin, chainState, contractAddress);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([], [], [nullifier])
      ];
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());

      // Act
      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        chainState,
        {
          currentIndex: 0n,
          coinPublicKey: walletCpk,
          inputs: [qualifiedCoin],
          outputs: []
        },
        sampleEncryptionPublicKey()
      );

      // Assert
      const fallible = tx.fallibleOffer;
      expect(fallible).toBeDefined();
      expect(fallible!.size).toBe(1);
      const [[, fallibleOffer]] = Array.from(fallible!.entries());
      expect(fallibleOffer.inputs.map((i) => i.nullifier)).toEqual([nullifier]);
      expect(tx.guaranteedOffer).toBeUndefined();
    });

    it('routes a user-bound output via claimedShieldedSpends only (union with receives matches ledger v8)', () => {
      // Arrange — a contract sending a shielded coin to a user populates the output's
      // commitment in claimedShieldedSpends, not claimedShieldedReceives (per ledger
      // construct.rs:158-170 and token_vault_shielded.rs:478-480 withdrawal pattern).
      // The fix must check the union of both fields.
      const walletCpk = sampleCoinPublicKey();
      const recipientCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 750n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([], [commitment], [])
      ];
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());
      const contractAddress = sampleContractAddress();

      // Act
      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        new ZswapChainState(),
        {
          currentIndex: 0n,
          coinPublicKey: walletCpk,
          inputs: [],
          outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: contractAddress } }]
        },
        () => epk
      );

      // Assert
      const fallible = tx.fallibleOffer;
      expect(fallible).toBeDefined();
      expect(fallible!.size).toBe(1);
      const [[, fallibleOffer]] = Array.from(fallible!.entries());
      expect(fallibleOffer.outputs.map((o) => o.commitment)).toEqual([commitment]);
      expect(tx.guaranteedOffer).toBeUndefined();
    });

    it('pairs a same-coin input and contract-owned output into a fallible-segment transient', () => {
      // Arrange — exercises the merge pattern from token_vault_shielded.rs:310-319:
      // a contract consumes a coin (nullifier in fallible) and re-emits it back to
      // itself (commitment in fallible receives). Should produce one transient, no
      // dangling input or output.
      const walletCpk = sampleCoinPublicKey();
      const contractAddress = sampleContractAddress();
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 1000n);
      const { chainState, qualifiedCoin } = seedContractCoin(coinInfo, contractAddress);
      const nullifier = probeNullifier(qualifiedCoin, chainState, contractAddress);
      const outputCommitment = ZswapOutput.newContractOwned(coinInfo, 0, contractAddress).commitment;
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([outputCommitment], [], [nullifier])
      ];
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());

      // Act
      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: { contractState: contractState.data.state, publicTranscript: [], partitionedTranscript: partitioned },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs: [] },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        chainState,
        {
          currentIndex: 0n,
          coinPublicKey: walletCpk,
          inputs: [qualifiedCoin],
          outputs: [{ coinInfo, recipient: { is_left: false, left: sampleCoinPublicKey(), right: contractAddress } }]
        },
        sampleEncryptionPublicKey()
      );

      // Assert
      const fallible = tx.fallibleOffer;
      expect(fallible).toBeDefined();
      expect(fallible!.size).toBe(1);
      const [[, fallibleOffer]] = Array.from(fallible!.entries());
      expect(fallibleOffer.inputs.length).toBe(0);
      expect(fallibleOffer.outputs.length).toBe(0);
      expect(fallibleOffer.transients.length).toBe(1);
      expect(fallibleOffer.transients[0]!.nullifier).toBe(nullifier);
    });
  });

  const makeTranscript = (
    claimedUnshieldedSpends: Map<[TokenType, PublicAddress], bigint>
  ): Transcript<AlignedValue> => ({
    gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
    effects: {
      claimedNullifiers: [toHex(randomBytes(32))],
      claimedShieldedReceives: [toHex(randomBytes(32))],
      claimedShieldedSpends: [toHex(randomBytes(32))],
      claimedContractCalls: [],
      shieldedMints: new Map(),
      unshieldedInputs: new Map(),
      unshieldedOutputs: new Map(),
      unshieldedMints: new Map(),
      claimedUnshieldedSpends
    },
    program: ['new', { noop: { n: 5 } }]
  });

  describe('extractUserAddressedOutputs', () => {
    it('returns empty array when transcript is undefined', () => {
      const result = extractUserAddressedOutputs(undefined);

      expect(result).toEqual([]);
    });

    it('returns empty array when claimedUnshieldedSpends is empty', () => {
      const transcript = makeTranscript(new Map());

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('returns output for user-addressed unshielded token spend', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 100n;
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('returns output for user-addressed shielded token spend', () => {
      const userAddress = sampleUserAddress();
      const tokenType = shieldedToken();
      const amount = 50n;
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('filters out contract-addressed spends', () => {
      const contractAddr = sampleContractAddress();
      const tokenType = unshieldedToken();
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'contract', address: contractAddr } as PublicAddress], 100n]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('filters out dust token spends even for user addresses', () => {
      const userAddress = sampleUserAddress();
      const dustTokenType = feeToken();
      const transcript = makeTranscript(
        new Map([[[dustTokenType, { tag: 'user', address: userAddress } as PublicAddress], 100n]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('returns only user-addressed non-dust outputs from mixed spends', () => {
      const userAddress1 = sampleUserAddress();
      const userAddress2 = sampleUserAddress();
      const contractAddr = sampleContractAddress();
      const unshieldedTok = unshieldedToken();
      const shieldedTok = shieldedToken();
      const dustTok = feeToken();

      const transcript = makeTranscript(
        new Map([
          [[unshieldedTok, { tag: 'user', address: userAddress1 } as PublicAddress], 100n],
          [[shieldedTok, { tag: 'user', address: userAddress2 } as PublicAddress], 200n],
          [[unshieldedTok, { tag: 'contract', address: contractAddr } as PublicAddress], 300n],
          [[dustTok, { tag: 'user', address: userAddress1 } as PublicAddress], 400n]
        ])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { value: 100n, owner: userAddress1, type: unshieldedTok.raw },
          { value: 200n, owner: userAddress2, type: shieldedTok.raw }
        ])
      );
    });
  });

  describe('createUnprovenLedgerCallTx unshielded offers', () => {
    const circuitId = 'unshieldedOfferTx';
    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [{ tag: 'atom', value: { tag: 'field' } }]
    };
    const privateTranscriptOutputs: AlignedValue[] = [];
    const nextZswapLocalState = {
      outputs: [],
      inputs: [],
      coinPublicKey: sampleCoinPublicKey(),
      currentIndex: 0n
    };

    const callTxWithTranscripts = (
      guaranteed: Transcript<AlignedValue> | undefined,
      fallible: Transcript<AlignedValue> | undefined
    ) => {
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, makeOperation());
      const contractAddress = sampleContractAddress();

      return createUnprovenLedgerCallTx(
        [
          {
            contractAddress: PlatformContractAddress.ContractAddress(contractAddress),
            circuitId,
            public: {
              contractState: contractState.data.state,
              publicTranscript: [],
              partitionedTranscript: [guaranteed, fallible] as PartitionedTranscript
            },
            private: { input: alignedValue, output: alignedValue, privateTranscriptOutputs },
            communicationCommitment: Option.none()
          }
        ],
        () => contractState,
        new ZswapChainState(),
        nextZswapLocalState,
        dummyEncPublicKey
      );
    };

    it('does not attach unshielded offers when transcripts are undefined', () => {
      const tx = callTxWithTranscripts(undefined, undefined);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeUndefined();
      expect(intent!.fallibleUnshieldedOffer).toBeUndefined();
    });

    it('attaches guaranteedUnshieldedOffer when guaranteed transcript has user-addressed spends', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 500n;
      const guaranteed = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );
      const fallible = makeTranscript(new Map());

      const tx = callTxWithTranscripts(guaranteed, fallible);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.guaranteedUnshieldedOffer!.outputs[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('attaches fallibleUnshieldedOffer when fallible transcript has user-addressed spends', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 750n;
      const guaranteed = makeTranscript(new Map());
      const fallible = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const tx = callTxWithTranscripts(guaranteed, fallible);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.fallibleUnshieldedOffer!.outputs[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('does not attach unshielded offers when only contract-addressed spends exist', () => {
      const contractAddr = sampleContractAddress();
      const tokenType = unshieldedToken();
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'contract', address: contractAddr } as PublicAddress], 100n]])
      );

      const tx = callTxWithTranscripts(transcript, transcript);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeUndefined();
      expect(intent!.fallibleUnshieldedOffer).toBeUndefined();
    });

    it('attaches offers to both guaranteed and fallible when both have user-addressed spends', () => {
      const userAddress1 = sampleUserAddress();
      const userAddress2 = sampleUserAddress();
      const tokenType = unshieldedToken();
      const guaranteed = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress1 } as PublicAddress], 100n]])
      );
      const fallible = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress2 } as PublicAddress], 200n]])
      );

      const tx = callTxWithTranscripts(guaranteed, fallible);

      const intent = tx.intents?.values().next().value;
      expect(intent!.guaranteedUnshieldedOffer).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.guaranteedUnshieldedOffer!.outputs[0].value).toBe(100n);
      expect(intent!.fallibleUnshieldedOffer).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.fallibleUnshieldedOffer!.outputs[0].value).toBe(200n);
    });
  });

  describe('UnshieldedOffer.new() preserves owner addresses (issue #720)', () => {
    it('preserves the owner address in a single output', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const output: UtxoOutput = { value: 1_000n, owner: userAddress, type: tokenType.raw };

      const offer = UnshieldedOffer.new([], [output], []);

      expect(offer.outputs).toHaveLength(1);
      expect(offer.outputs[0].owner).toBe(userAddress);
      expect(offer.outputs[0].value).toBe(1_000n);
      expect(offer.outputs[0].type).toBe(tokenType.raw);
    });

    it('preserves distinct owner addresses across multiple outputs', () => {
      const address1 = sampleUserAddress();
      const address2 = sampleUserAddress();
      const tokenType = unshieldedToken();

      const outputs: UtxoOutput[] = [
        { value: 500n, owner: address1, type: tokenType.raw },
        { value: 300n, owner: address2, type: tokenType.raw }
      ];

      const offer = UnshieldedOffer.new([], outputs, []);

      expect(offer.outputs).toHaveLength(2);
      const owners = offer.outputs.map((o) => o.owner);
      expect(owners).toContain(address1);
      expect(owners).toContain(address2);
    });

    it('preserves owner address after attaching to intent fallibleUnshieldedOffer', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const output: UtxoOutput = { value: 1_000n, owner: userAddress, type: tokenType.raw };
      const offer = UnshieldedOffer.new([], [output], []);

      const intent = Intent.new(new Date(Date.now() + 3_600_000));
      intent.fallibleUnshieldedOffer = offer;

      expect(intent.fallibleUnshieldedOffer).toBeDefined();
      expect(intent.fallibleUnshieldedOffer!.outputs[0].owner).toBe(userAddress);
    });
  });

  // Regression tests for issue-816 refactor: verify the 3 helpers route bad
  // input through the typed-wrapper layer and produce a DeserializationError
  // with the fully-qualified caller string. Locks the wiring against future
  // accidental reverts to raw .deserialize/.decode calls.
  describe('deserialization wrapper wiring (issue-816)', () => {
    const PKG = '@midnight-ntwrk/midnight-js-contracts';

    // Object with a .serialize() that returns invalid bytes. Casting to the
    // expected nominal type because runtime only invokes .serialize().
    const stubWithBadSerialize = <T>(): T =>
      ({ serialize: () => new Uint8Array([0xff, 0xff, 0xff]) }) as unknown as T;

    it('toLedgerContractState throws DeserializationError tagged with the helper caller', () => {
      let caught: unknown;
      try {
        toLedgerContractState(stubWithBadSerialize<CompactContractState>());
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe(`${PKG}:toLedgerContractState`);
        expect(caught.context.source).toBe('ledger');
      }
    });

    it('fromLedgerContractState throws DeserializationError tagged with the helper caller', () => {
      let caught: unknown;
      try {
        // Stub mimics the ledger ContractState shape (only .serialize() is invoked).
        fromLedgerContractState(stubWithBadSerialize());
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe(`${PKG}:fromLedgerContractState`);
        expect(caught.context.source).toBe('compact-runtime');
      }
    });

    it('toLedgerQueryContext throws DeserializationError tagged with the helper caller', () => {
      // QueryContext.state.state.encode() must return an EncodedStateValue —
      // we supply a malformed tag to make decode fail.
      const stubQueryContext = {
        state: { state: { encode: () => ({ tag: 'not-a-real-tag' }) } }
      } as unknown as QueryContext;

      let caught: unknown;
      try {
        toLedgerQueryContext(stubQueryContext);
      } catch (e) {
        caught = e;
      }

      expect(isDeserializationError(caught)).toBe(true);
      if (isDeserializationError(caught)) {
        expect(caught.context.caller).toBe(`${PKG}:toLedgerQueryContext`);
        expect(caught.context.source).toBe('onchain-runtime');
      }
    });
  });
});
