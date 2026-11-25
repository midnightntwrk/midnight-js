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

import {
  Transaction,
  type UnprovenTransaction,
  ZswapOffer,
  ZswapOutput
} from '@midnightntwrk/midnight-js-protocol/v9';
import { describe, expect, it } from 'vitest';

import { assertEffectsMatchTransaction } from '../internal/utils/ledger-utils';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import { createLedger9UnprovenCallTx } from '../unproven-call-tx';
import {
  callee,
  calleeKeys,
  caller,
  callerKeys,
  chainOf,
  chainWithShieldedMap,
  deployedCallee,
  deployedCaller,
  deployedUnshieldedBalance,
  deposit,
  ledgerWellFormed,
  provenInput,
  shieldedCoin,
  unshieldedBalance,
  unshieldedBalanceKeys
} from './scoped-transaction-fixtures';
import { createMockContractAddress } from './test-mocks';

/*
 * Each of the five comparisons the claim check makes refuses a transaction the ledger's own
 * `wellFormed` refuses for the same reason. Each transaction is built whole by a call, then has one
 * part taken away so that what its transcripts claim no longer matches it in one respect.
 */

const unproven = (handle: { deserialize: (markers: { v9: typeof Transaction }) => unknown }): UnprovenTransaction =>
  handle.deserialize({ v9: Transaction }) as UnprovenTransaction;

/** Both checks over `tx`: the claim check's refusal, if any, and the ledger's. */
const judged = (tx: UnprovenTransaction): { ours: unknown; ledger: true | string } => {
  let ours: unknown;
  try {
    assertEffectsMatchTransaction(tx);
  } catch (error) {
    ours = error;
  }
  return { ours, ledger: ledgerWellFormed(tx) };
};

/** A `callee.mintAndSend` built alone: a coin minted to the callee, 400 of it sent to the wallet, 600 back. */
const mintAndSend = async () => {
  const address = createMockContractAddress();
  const chain = await chainOf(new Map([[address, deployedCallee()]]));
  const { providers } = chain.withKeys(calleeKeys);
  const wallet = providers.walletProvider.getCoinPublicKey();
  const built = await createLedger9UnprovenCallTx(providers, {
    compiledContract: callee,
    contractAddress: address,
    circuitId: 'mintAndSend',
    args: [new Uint8Array(32).fill(7), 1000n, new Uint8Array(32).fill(3), { bytes: new Uint8Array(Buffer.from(wallet, 'hex')) }, 400n]
  });
  const local = built.calls[built.calls.length - 1].private.zswapLocalState;
  const coinOf = (value: bigint) => local.outputs.find((output) => output.coinInfo.value === value)!.coinInfo;
  const offer = unproven(built.private.unprovenTx).guaranteedOffer!;
  return {
    address,
    fresh: () => unproven(built.private.unprovenTx),
    minted: coinOf(1000n),
    sent: { output: offer.outputs.find((output) => output.contractAddress === undefined)!, coin: coinOf(400n) },
    change: { output: offer.outputs.find((output) => output.contractAddress !== undefined)!, coin: coinOf(600n) },
    transient: offer.transients[0]
  };
};

describe('the claim check and the ledger refuse the same transactions', () => {
  it('both take a transaction whose claims match it', async () => {
    // Arrange
    const { fresh } = await mintAndSend();

    // Act
    const { ours, ledger } = judged(fresh());

    // Assert: RED WHEN either check refuses a transaction a call built whole.
    expect(ours).toBeUndefined();
    expect(ledger).toBe(true);
  });

  it('a received coin with no offer carrying it', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const tx = unproven((await createLedger9UnprovenCallTx(providers, deposit(contractAddress, 1))).private.unprovenTx);
    tx.guaranteedOffer = undefined;

    // Act
    const { ours, ledger } = judged(tx);

    // Assert: RED WHEN either check takes it.
    expect(String(ours)).toMatch(/must be claimed as received by that contract/);
    expect(ledger).toMatch(/contract-associated commitments must be claimed/);
  });

  it('a spent coin whose nullifier no offer carries', async () => {
    // Arrange: the minted coin is offered as an output, no longer spent as a transient.
    const { address, fresh, minted, sent, change } = await mintAndSend();
    const tx = fresh();
    tx.guaranteedOffer = ZswapOffer.fromOutput(ZswapOutput.newContractOwned(minted, 0, address), minted.type, minted.value)
      .merge(ZswapOffer.fromOutput(sent.output, sent.coin.type, sent.coin.value))
      .merge(ZswapOffer.fromOutput(change.output, change.coin.type, change.coin.value));

    // Act
    const { ours, ledger } = judged(tx);

    // Assert: RED WHEN either check takes it.
    expect(String(ours)).toMatch(/must be claimed as spent by that contract, by its nullifier/);
    expect(ledger).toMatch(/contract-associated nullifiers must be claimed/);
  });

  it('a coin claimed as sent that no offer creates', async () => {
    // Arrange: the coin sent to the wallet is left out of the offer.
    const { fresh, change, transient } = await mintAndSend();
    const tx = fresh();
    tx.guaranteedOffer = ZswapOffer.fromTransient(transient).merge(
      ZswapOffer.fromOutput(change.output, change.coin.type, change.coin.value)
    );

    // Act
    const { ours, ledger } = judged(tx);

    // Assert: RED WHEN either check takes it.
    expect(String(ours)).toMatch(/claims to send must be among the coins the offers create/);
    expect(ledger).toMatch(/claimed_shielded_spends is not a subset of all_commitments/);
  });

  it('a contract call claimed that the intent does not make', async () => {
    // Arrange: the callee's call and the coin it received are taken out of a call made through the caller.
    const calleeAddress = createMockContractAddress();
    const callerAddress = createMockContractAddress();
    const chain = await chainOf(
      new Map([
        [calleeAddress, deployedCallee()],
        [callerAddress, deployedCaller(calleeAddress)]
      ]),
      [calleeAddress]
    );
    const { providers } = chain.withKeys(callerKeys);
    const built = await createLedger9UnprovenCallTx(providers, {
      compiledContract: caller,
      contractAddress: callerAddress,
      circuitId: 'depositToCallee',
      args: [shieldedCoin(4)]
    });
    const tx = unproven(built.private.unprovenTx);
    const [[segment, intent]] = [...tx.intents!.entries()];
    intent.actions = intent.actions.filter((action) => !('address' in action) || String(action.address) !== calleeAddress);
    tx.intents = new Map([[segment, intent]]);
    tx.guaranteedOffer = undefined;

    // Act
    const { ours, ledger } = judged(tx);

    // Assert: RED WHEN either check takes it.
    expect(String(ours)).toMatch(/A contract call a transcript claims must be a call of the same intent/);
    expect(ledger).toMatch(/claimed_calls is not a subset of real_calls/);
  });

  it('an unshielded payment claimed that no unshielded offer makes', async () => {
    // Arrange: a payment out of the contract to a user, its unshielded offer taken away.
    const tokens = createMockContractAddress();
    const chain = await chainOf(new Map([[tokens, deployedUnshieldedBalance()]]));
    const { providers } = chain.withKeys(unshieldedBalanceKeys);
    const user = { bytes: new Uint8Array(32).fill(5) };
    await withContractScopedTransaction(providers, async (txCtx) => {
      const color = (
        await submitCallTx(providers, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'mintToSelf', args: [new Uint8Array(32).fill(1), 100n] }, txCtx)
      ).private.result;
      await submitCallTx(providers, { compiledContract: unshieldedBalance, contractAddress: tokens, circuitId: 'sendToUser', args: [color, 40n, user] }, txCtx);
    });
    const tx = provenInput(providers.proofProvider.proveTx);
    const [[segment, intent]] = [...tx.intents!.entries()];
    intent.guaranteedUnshieldedOffer = undefined;
    tx.intents = new Map([[segment, intent]]);

    // Act
    const { ours, ledger } = judged(tx);

    // Assert: RED WHEN either check takes it.
    expect(String(ours)).toMatch(/An unshielded payment a transcript claims must be met in the same intent and half/);
    expect(ledger).toMatch(/claimed_unshielded_spends is not a subset of real_unshielded_spends/);
  });
});
