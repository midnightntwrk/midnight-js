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

import type { ContractState as Ledger9ContractState, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractState as Ledger8ContractState } from '@midnight-ntwrk/midnight-js-protocol/v8';
import { describe, expectTypeOf, it } from 'vitest';

import { LedgerState, type StateDecoders } from '../ledger-state';

declare const anyEraState: LedgerState<'ContractState'>;
declare const ledger9State: LedgerState<'ContractState', 'v9'>;
declare const ledger8State: LedgerState<'ContractState', 'v8'>;
declare const parameters: LedgerState<'LedgerParameters'>;
declare const ledger9Decoder: typeof Ledger9ContractState;
declare const ledger8Decoder: typeof Ledger8ContractState;
declare const parametersDecoder: typeof LedgerParameters;
declare const optionalDecoders: { readonly v9?: typeof Ledger9ContractState };
declare const typedDecoders: StateDecoders;
declare const bytes: Uint8Array;

describe('LedgerState.fromBytes', () => {
  it('infers the era and the kind from its arguments', () => {
    expectTypeOf(LedgerState.fromBytes('v9', 'ContractState', bytes)).toEqualTypeOf<LedgerState<'ContractState', 'v9'>>();
  });

  it('cannot be bypassed with new', () => {
    // @ts-expect-error the constructor is private
    expectTypeOf(new LedgerState('v9', 'ContractState', bytes)).not.toBeAny();
  });
});

describe('LedgerState.deserialize', () => {
  it('returns what the decoder of the value era returns', () => {
    expectTypeOf(ledger9State.deserialize({ v9: ledger9Decoder })).toEqualTypeOf<Ledger9ContractState>();
    expectTypeOf(ledger8State.deserialize({ v8: ledger8Decoder })).toEqualTypeOf<Ledger8ContractState>();
  });

  it('returns either era object when the era is not known', () => {
    expectTypeOf(anyEraState.deserialize({ v8: ledger8Decoder, v9: ledger9Decoder })).toEqualTypeOf<
      Ledger8ContractState | Ledger9ContractState
    >();
  });

  it('returns the decoded type when only the current-era decoder is passed for a value of any era', () => {
    expectTypeOf(anyEraState.deserialize({ v9: ledger9Decoder })).toEqualTypeOf<Ledger9ContractState>();
  });

  it('returns never when the decoders cannot read the value era', () => {
    expectTypeOf(ledger8State.deserialize({ v9: ledger9Decoder })).toBeNever();
  });

  it('returns the decoded type for a decoder under an optional key', () => {
    expectTypeOf(ledger9State.deserialize(optionalDecoders)).toEqualTypeOf<Ledger9ContractState>();
  });

  it('returns unknown, not never, for decoders typed as StateDecoders', () => {
    expectTypeOf(ledger9State.deserialize(typedDecoders)).toBeUnknown();
  });

  it('keeps the kinds apart', () => {
    expectTypeOf(parameters).not.toExtend<LedgerState<'ContractState'>>();
    expectTypeOf(parameters.deserialize({ v9: parametersDecoder })).toEqualTypeOf<LedgerParameters>();
  });
});
