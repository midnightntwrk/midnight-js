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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import type { ComposeCallOptions, ComposeDeployOptions } from '../lib/era/compose-types';
import { loadLedgerEra } from '../lib/era/load-era';
import type { LedgerVersion } from '../lib/ledger-version';

// What parity means here, and what it deliberately does NOT mean.
//
// The facade's promise is that the same scenario, run through either era,
// yields the same SHAPE: the same method names, the same result types, the same
// counts, the same entry-point names and verifier-key hashes. It is not a
// promise of byte parity, and asserting that would be asserting something
// false — the two eras serialize to different tagged formats, and
// engine-compose-v8.test.ts pins the v8 transaction tag literally to prove the
// point. A composed transaction is therefore read back apart with the era's own
// decoder and compared structurally, never byte-for-byte across eras.
//
// The one place values ARE compared across eras is the golden pair: two
// committed states of the same contract, one written before the migration and
// one after. Those really must decode to the same data, and that is what makes
// every other comparison below meaningful.

const FIXTURES_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf');

const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim();
  const bytes = Uint8Array.from(Buffer.from(text, 'hex'));
  if (bytes.length * 2 !== text.length) {
    throw new Error(`fixture ${name} is not valid hex in full: ${text.length} chars decoded to ${bytes.length} bytes`);
  }
  return bytes;
};

const VERIFIER_KEY = new Uint8Array(
  readFileSync(resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier'))
);

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});
const PRE_STATE = ocrt3.StateValue.newCell(fieldValue(0x01)).encode();
const PUBLIC_TRANSCRIPT: ocrt3.Op<ocrt3.AlignedValue>[] = [{ noop: { n: 1 } }];

const NETWORK_ID = 'test-network';
const ttl = (): Date => new Date(Date.now() + 3_600_000);

/** How many calls and deploys a composed transaction carries, read back per era. */
interface TransactionShape {
  readonly intents: number;
  readonly calls: readonly { readonly address: string; readonly entryPoint: string | Uint8Array }[];
  readonly deployAddresses: readonly string[];
  readonly deployedStateEntryPoints: readonly (string | Uint8Array)[];
}

interface EraFixture {
  /** The golden this era wrote: the same contract, before and after the migration. */
  readonly golden: string;
  /** A state declaring `increment` with a real deployed key — what a call dispatches against. */
  readonly keyedContractState: () => Uint8Array;
  /** A state declaring `increment` with a BLANK key — what a constructor produces. */
  readonly blankContractState: () => Uint8Array;
  readonly readTransaction: (bytes: Uint8Array) => TransactionShape;
}

const v8Fixture: EraFixture = {
  golden: 'state-v8.hex',
  keyedContractState: () => {
    const contractState = new LedgerV8.ContractState();
    const operation = new LedgerV8.ContractOperation();
    operation.verifierKey = VERIFIER_KEY;
    contractState.setOperation('increment', operation);
    return contractState.serialize();
  },
  blankContractState: () => {
    const contractState = new LedgerV8.ContractState();
    contractState.setOperation('increment', new LedgerV8.ContractOperation());
    return contractState.serialize();
  },
  readTransaction: (bytes) => {
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const intents = [...(back.intents?.values() ?? [])];
    const actions = intents.flatMap((intent) => intent.actions);
    const deploys = actions.filter((action) => action instanceof LedgerV8.ContractDeploy);
    return {
      intents: intents.length,
      calls: actions
        .filter((action) => action instanceof LedgerV8.ContractCall)
        .map((call) => ({ address: call.address, entryPoint: call.entryPoint })),
      deployAddresses: deploys.map((deploy) => deploy.address),
      deployedStateEntryPoints: deploys.flatMap((deploy) => deploy.initialState.operations())
    };
  }
};

const v9Fixture: EraFixture = {
  golden: 'state-migrated-v9.hex',
  keyedContractState: () => {
    const contractState = new ledgerV9.ContractState();
    const operation = new ledgerV9.ContractOperation();
    operation.verifierKey = VERIFIER_KEY;
    contractState.setOperation('increment', operation);
    return contractState.serialize();
  },
  blankContractState: () => {
    const contractState = new ledgerV9.ContractState();
    contractState.setOperation('increment', new ledgerV9.ContractOperation());
    return contractState.serialize();
  },
  readTransaction: (bytes) => {
    const back = ledgerV9.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const intents = [...(back.intents?.values() ?? [])];
    const actions = intents.flatMap((intent) => intent.actions);
    const deploys = actions.filter((action) => action instanceof ledgerV9.ContractDeploy);
    return {
      intents: intents.length,
      calls: actions
        .filter((action) => action instanceof ledgerV9.ContractCall)
        .map((call) => ({ address: call.address, entryPoint: call.entryPoint })),
      deployAddresses: deploys.map((deploy) => deploy.address),
      deployedStateEntryPoints: deploys.flatMap((deploy) => deploy.initialState.operations())
    };
  }
};

const FIXTURES: Readonly<Record<LedgerVersion, EraFixture>> = { v8: v8Fixture, v9: v9Fixture };

const callOptionsFor = (version: LedgerVersion): ComposeCallOptions => ({
  calls: [
    {
      contractAddress: ocrt3.dummyContractAddress(),
      circuitId: 'increment',
      contractState: FIXTURES[version].keyedContractState(),
      transcript: { kind: 'unpartitioned', preState: PRE_STATE, publicTranscript: PUBLIC_TRANSCRIPT },
      privateTranscriptOutputs: [],
      input: fieldValue(0x10),
      output: fieldValue(0x20)
    }
  ],
  networkId: NETWORK_ID,
  ttl: ttl()
});

const deployOptionsFor = (version: LedgerVersion): ComposeDeployOptions => ({
  contractState: FIXTURES[version].blankContractState(),
  verifierKeys: new Map([['increment', VERIFIER_KEY]]),
  networkId: NETWORK_ID,
  ttl: ttl()
});

const ERAS = ['v8', 'v9'] as const;

describe('the two ledger eras run the same scenario', () => {
  // The golden pair is the one place a cross-era VALUE comparison is legitimate:
  // the two files are the same contract's state either side of the migration, so
  // reading each through its own era must land on identical data. Everything
  // else in this file compares shape, because the eras' serializations differ by
  // design.
  it('reads the golden pair to identical state', async () => {
    const [v8, v9] = await Promise.all([loadLedgerEra('v8'), loadLedgerEra('v9')]);

    expect(v8.extractState(readHexFixture(v8Fixture.golden))).toEqual(
      v9.extractState(readHexFixture(v9Fixture.golden))
    );
  });

  it('decodes the golden pair to the same entry points and the same verifier-key hashes', async () => {
    const [v8, v9] = await Promise.all([loadLedgerEra('v8'), loadLedgerEra('v9')]);

    const fromV8 = v8.decodeContractState(readHexFixture(v8Fixture.golden));
    const fromV9 = v9.decodeContractState(readHexFixture(v9Fixture.golden));

    expect(Object.keys(fromV8).sort()).toEqual(Object.keys(fromV9).sort());
    expect(fromV8.entryPoints.map((entry) => entry.circuitId).sort()).toEqual(
      fromV9.entryPoints.map((entry) => entry.circuitId).sort()
    );
    // The hash is what a prover resolves an artifact by, so the two eras
    // disagreeing here would send the same contract to two different keys.
    const hashesByCircuit = (pojo: typeof fromV8): [string, string | undefined][] =>
      pojo.entryPoints.map((entry) => [entry.circuitId, entry.verifierKeyHash]);
    expect(hashesByCircuit(fromV8).sort()).toEqual(hashesByCircuit(fromV9).sort());
    expect(fromV8.entryPoints.every((entry) => entry.verifierKeyHash !== undefined)).toBe(true);
  });

  it.each(ERAS)('composes one call into one intent on %s', async (version) => {
    const era = await loadLedgerEra(version);
    const options = callOptionsFor(version);

    const shape = FIXTURES[version].readTransaction(era.composeCallTx(options));

    expect(shape.intents).toBe(1);
    expect(shape.calls).toHaveLength(1);
    expect(shape.calls[0].address).toBe(options.calls[0].contractAddress);
    expect(shape.calls[0].entryPoint).toBe('increment');
    expect(shape.deployAddresses).toEqual([]);
  });

  it.each(ERAS)('composes a deploy whose returned address is the one the transaction carries on %s', async (version) => {
    const era = await loadLedgerEra(version);

    const result = era.composeDeployTx(deployOptionsFor(version));

    const shape = FIXTURES[version].readTransaction(result.transaction);
    expect(shape.intents).toBe(1);
    expect(shape.calls).toEqual([]);
    expect(shape.deployAddresses).toEqual([result.contractAddress]);
    expect(shape.deployedStateEntryPoints).toEqual(['increment']);
  });

  // The boundary rule, mechanised across the whole surface: only plain data
  // crosses the facade. A live WASM handle in any of these results would make
  // structuredClone throw, so this fails rather than shipping one.
  it.each(ERAS)('returns only structured-cloneable data from every %s method', async (version) => {
    const era = await loadLedgerEra(version);
    const golden = readHexFixture(FIXTURES[version].golden);

    expect(() => structuredClone(era.extractState(golden))).not.toThrow();
    expect(() => structuredClone(era.decodeContractState(golden))).not.toThrow();
    expect(() => structuredClone(era.composeCallTx(callOptionsFor(version)))).not.toThrow();
    expect(() => structuredClone(era.composeDeployTx(deployOptionsFor(version)))).not.toThrow();
  });

  it.each(ERAS)('exposes the same method names on %s', async (version) => {
    const era = await loadLedgerEra(version);

    expect(Object.keys(era).sort()).toEqual([
      'composeCallTx',
      'composeDeployTx',
      'decodeContractState',
      'extractState',
      'version'
    ]);
  });
});
