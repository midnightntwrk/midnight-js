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

import type {
  Binding,
  CoinPublicKey,
  ContractAddress,
  EncPublicKey,
  FinalizedTransaction,
  PreBinding,
  Proof,
  SignatureEnabled,
  Transaction,
  TransactionId,
  UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expectTypeOf, it } from 'vitest';

import type { MidnightProvider } from '../midnight-provider';
import type {
  ProofProvider,
  ProveTxConfig,
  VersionedUnboundTransaction,
  VersionedUnprovenTransaction
} from '../proof-provider';
import type { PublicDataProvider, WatchOptions } from '../public-data-provider';
import type { Ledger8TransactionBytes, VersionedFinalizedTxData } from '../versioned';
import type { VersionedFinalizedTransaction, WalletProvider } from '../wallet-provider';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` cases, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package, enabled unconditionally in
// `vitest.config.ts`, which surfaces `tsc` diagnostics against this file as
// test failures; a plain `yarn test` runs them. Running these bodies at
// runtime is incidental — `expectTypeOf(...)` performs no runtime assertion.

// Every fixture below is spelled out by hand rather than derived from the
// type under test (no `Omit`/`keyof`/`Parameters` off the real type), so the
// equality checks pin the real shape instead of reflexively restating it.
type Ledger8TransactionBytesFixture = {
  readonly version: 'v8';
  readonly txBytes: Uint8Array;
};

type UnprovenFixture = Ledger8TransactionBytesFixture | { readonly version: 'v9'; readonly tx: UnprovenTransaction };
type UnboundFixture =
  | Ledger8TransactionBytesFixture
  | { readonly version: 'v9'; readonly tx: Transaction<SignatureEnabled, Proof, PreBinding> };
type FinalizedFixture =
  | Ledger8TransactionBytesFixture
  | { readonly version: 'v9'; readonly tx: Transaction<SignatureEnabled, Proof, Binding> };

type ProveTxFixture = (
  unprovenTx: UnprovenFixture,
  proveTxConfig?: ProveTxConfig
) => Promise<UnboundFixture>;
type BalanceTxFixture = (tx: UnboundFixture, ttl?: Date) => Promise<FinalizedFixture>;
type SubmitTxFixture = (tx: FinalizedFixture) => Promise<TransactionId>;

describe('Ledger8TransactionBytes', () => {
  it('carries exactly the version discriminant and the serialized bytes — fails if a field is dropped, added, or retyped', () => {
    expectTypeOf<Ledger8TransactionBytesFixture>().toEqualTypeOf<Ledger8TransactionBytes>();
  });
});

describe('VersionedUnprovenTransaction', () => {
  it('is exhaustively narrowable, so the default branch receives never', () => {
    const describeUnproven = (payload: VersionedUnprovenTransaction) => {
      switch (payload.version) {
        case 'v8':
          return `v8:${payload.txBytes.byteLength}`;
        case 'v9':
          return `v9:${typeof payload.tx}`;
        default: {
          // Fails to compile if a variant is added to the union without a case
          // above, which is the property under test.
          const unhandled: never = payload;
          return unhandled;
        }
      }
    };

    // Asserting the *inferred* return type: annotating it `string` would make
    // this unfalsifiable. `never` drops out of a union, so a genuine `string`
    // here means both variants were reached.
    expectTypeOf(describeUnproven).returns.toEqualTypeOf<string>();
  });

  it('rejects naked serialized bytes — the v8 variant is always the tagged object, never a bare Uint8Array', () => {
    // Return type deliberately left to inference: annotating it `'v8' | 'v9'`
    // would make the assertion below restate the annotation instead of pinning
    // the discriminant, and a widened `version` would still pass.
    const acceptUnproven = (payload: VersionedUnprovenTransaction) => payload.version;

    // @ts-expect-error A bare `Uint8Array` carries no `version` discriminant, so a
    // consumer could not tell which ledger runtime serialized it. Callers must
    // always wrap the bytes as `{ version: 'v8', txBytes }`.
    acceptUnproven(new Uint8Array([1, 2, 3]));

    expectTypeOf(acceptUnproven).returns.toEqualTypeOf<'v8' | 'v9'>();
  });

  it('accepts both the v8 bytes variant and the v9 live-object variant — fails if either variant stops being assignable', () => {
    // The annotated declarations themselves are the assignability check: an
    // variant that stopped being part of the union would not compile here. The
    // assertions then pin what each annotation narrowed down to, so a variant
    // silently absorbing the other one's shape also fails.
    const ledger8Variant: VersionedUnprovenTransaction = { version: 'v8', txBytes: new Uint8Array([1, 2, 3]) };
    const ledger9Variant: VersionedUnprovenTransaction = { version: 'v9', tx: {} as UnprovenTransaction };

    expectTypeOf(ledger8Variant).toEqualTypeOf<Ledger8TransactionBytesFixture>();
    expectTypeOf(ledger9Variant).toEqualTypeOf<{ readonly version: 'v9'; readonly tx: UnprovenTransaction }>();
  });

  it('has exactly the v8 and v9 variants — fails if a variant is removed, a third variant added, or a discriminant widened', () => {
    expectTypeOf<VersionedUnprovenTransaction['version']>().toEqualTypeOf<'v8' | 'v9'>();
  });

  it('pins both variants to the hand-written fixture — fails if the v9 variant stops carrying an unproven transaction', () => {
    expectTypeOf<UnprovenFixture>().toEqualTypeOf<VersionedUnprovenTransaction>();
  });
});

describe('VersionedUnboundTransaction', () => {
  it('is exhaustively narrowable, so the default branch receives never', () => {
    const describeUnbound = (payload: VersionedUnboundTransaction) => {
      switch (payload.version) {
        case 'v8':
          return `v8:${payload.txBytes.byteLength}`;
        case 'v9':
          return `v9:${typeof payload.tx}`;
        default: {
          // Fails to compile if a variant is added to the union without a case
          // above, which is the property under test.
          const unhandled: never = payload;
          return unhandled;
        }
      }
    };

    // Asserting the *inferred* return type: annotating it `string` would make
    // this unfalsifiable. `never` drops out of a union, so a genuine `string`
    // here means both variants were reached.
    expectTypeOf(describeUnbound).returns.toEqualTypeOf<string>();
  });

  it('rejects naked serialized bytes — the v8 variant is always the tagged object, never a bare Uint8Array', () => {
    // Inferred, not annotated — see the unproven case.
    const acceptUnbound = (payload: VersionedUnboundTransaction) => payload.version;

    // @ts-expect-error See the unproven-transaction case: bytes must be tagged.
    acceptUnbound(new Uint8Array([1, 2, 3]));

    expectTypeOf(acceptUnbound).returns.toEqualTypeOf<'v8' | 'v9'>();
  });

  it('has exactly the v8 and v9 variants — fails if a variant is removed, a third variant added, or a discriminant widened', () => {
    expectTypeOf<VersionedUnboundTransaction['version']>().toEqualTypeOf<'v8' | 'v9'>();
  });

  it('pins both variants to the hand-written fixture — fails if the v9 variant stops carrying a pre-binding transaction', () => {
    expectTypeOf<UnboundFixture>().toEqualTypeOf<VersionedUnboundTransaction>();
  });
});

describe('VersionedFinalizedTransaction', () => {
  it('is exhaustively narrowable, so the default branch receives never', () => {
    const describeFinalized = (payload: VersionedFinalizedTransaction) => {
      switch (payload.version) {
        case 'v8':
          return `v8:${payload.txBytes.byteLength}`;
        case 'v9':
          return `v9:${typeof payload.tx}`;
        default: {
          // Fails to compile if a variant is added to the union without a case
          // above, which is the property under test.
          const unhandled: never = payload;
          return unhandled;
        }
      }
    };

    // Asserting the *inferred* return type: annotating it `string` would make
    // this unfalsifiable. `never` drops out of a union, so a genuine `string`
    // here means both variants were reached.
    expectTypeOf(describeFinalized).returns.toEqualTypeOf<string>();
  });

  it('rejects naked serialized bytes — the v8 variant is always the tagged object, never a bare Uint8Array', () => {
    // Inferred, not annotated — see the unproven case.
    const acceptFinalized = (payload: VersionedFinalizedTransaction) => payload.version;

    // @ts-expect-error See the unproven-transaction case: bytes must be tagged.
    acceptFinalized(new Uint8Array([1, 2, 3]));

    expectTypeOf(acceptFinalized).returns.toEqualTypeOf<'v8' | 'v9'>();
  });

  it('accepts both the v8 bytes variant and the v9 live-object variant — fails if either variant stops being assignable', () => {
    const ledger8Variant: VersionedFinalizedTransaction = { version: 'v8', txBytes: new Uint8Array([1, 2, 3]) };
    const ledger9Variant: VersionedFinalizedTransaction = { version: 'v9', tx: {} as FinalizedTransaction };

    expectTypeOf(ledger8Variant).toEqualTypeOf<Ledger8TransactionBytesFixture>();
    expectTypeOf(ledger9Variant).toEqualTypeOf<{ readonly version: 'v9'; readonly tx: FinalizedTransaction }>();
  });

  it('has exactly the v8 and v9 variants — fails if a variant is removed, a third variant added, or a discriminant widened', () => {
    expectTypeOf<VersionedFinalizedTransaction['version']>().toEqualTypeOf<'v8' | 'v9'>();
  });

  it('pins both variants to the hand-written fixture — fails if the v9 variant stops carrying a bound transaction', () => {
    expectTypeOf<FinalizedFixture>().toEqualTypeOf<VersionedFinalizedTransaction>();
  });
});

describe('tx-flow provider members', () => {
  it('proveTx takes a versioned unproven payload and resolves a versioned unbound payload', () => {
    expectTypeOf<ProofProvider['proveTx']>().toEqualTypeOf<ProveTxFixture>();
  });

  it('balanceTx takes a versioned unbound payload and resolves a versioned finalized payload', () => {
    expectTypeOf<WalletProvider['balanceTx']>().toEqualTypeOf<BalanceTxFixture>();
  });

  it('submitTx takes a versioned finalized payload and resolves a transaction identifier', () => {
    expectTypeOf<MidnightProvider['submitTx']>().toEqualTypeOf<SubmitTxFixture>();
  });

  it('keeps the key-reading members of WalletProvider untouched by the payload change', () => {
    expectTypeOf<WalletProvider['getCoinPublicKey']>().toEqualTypeOf<() => CoinPublicKey>();
    expectTypeOf<WalletProvider['getEncryptionPublicKey']>().toEqualTypeOf<() => EncPublicKey>();
  });
});

// The read surface changed its return type in the same breaking release as the
// three transaction methods above, but was the only one of the five with nothing pinning it.
// Reverting either signature to `Promise<FinalizedTxData>` still type-checks
// everywhere — `FinalizedTxData` is assignable to the union that consumes it —
// so neither the runtime tests nor the other type tests would notice.
describe('read-surface provider members', () => {
  it('watchForTxData resolves a version-tagged finalized record', () => {
    expectTypeOf<PublicDataProvider['watchForTxData']>().toEqualTypeOf<
      (txId: TransactionId, options?: WatchOptions) => Promise<VersionedFinalizedTxData>
    >();
  });

  it('watchForDeployTxData resolves a version-tagged finalized record', () => {
    expectTypeOf<PublicDataProvider['watchForDeployTxData']>().toEqualTypeOf<
      (contractAddress: ContractAddress, options?: WatchOptions) => Promise<VersionedFinalizedTxData>
    >();
  });
});
