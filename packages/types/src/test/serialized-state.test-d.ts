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

import type { ContractState as Ledger8ContractState } from '@midnight-ntwrk/midnight-js-protocol/v8';
import type { ContractState as Ledger9ContractState, LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expectTypeOf, it } from 'vitest';

import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
  type StateDecoders
} from '../serialized-state';

declare const anyEraState: SerializedContractState;
declare const ledger9State: SerializedContractState<'v9'>;
declare const ledger8State: SerializedContractState<'v8'>;
declare const parameters: SerializedLedgerParameters;
declare const zswap: SerializedZswapChainState;
declare const ledger9Decoder: typeof Ledger9ContractState;
declare const ledger8Decoder: typeof Ledger8ContractState;
declare const parametersDecoder: typeof LedgerParameters;
declare const zswapDecoder: typeof ZswapChainState;
declare const optionalDecoders: { readonly v9?: typeof Ledger9ContractState };
declare const typedDecoders: StateDecoders;
declare const bytes: Uint8Array;

describe('fromBytes', () => {
  it('infers the era from its argument', () => {
    expectTypeOf(SerializedContractState.fromBytes('v9', bytes)).toEqualTypeOf<SerializedContractState<'v9'>>();
    expectTypeOf(SerializedLedgerParameters.fromBytes('v8', bytes)).toEqualTypeOf<SerializedLedgerParameters<'v8'>>();
    expectTypeOf(SerializedZswapChainState.fromBytes('v9', bytes)).toEqualTypeOf<SerializedZswapChainState<'v9'>>();
  });

  it('takes no kind', () => {
    // @ts-expect-error the class is the kind
    SerializedContractState.fromBytes('v9', 'ContractState', bytes);
  });

  it('cannot be bypassed with new', () => {
    // @ts-expect-error the constructor is private
    expectTypeOf(new SerializedContractState(Symbol('fromBytes'), 'v9', bytes)).not.toBeAny();
  });

  it('refuses an era outside LedgerVersion', () => {
    // @ts-expect-error the era is outside LedgerVersion
    SerializedContractState.fromBytes('v10', bytes);
  });
});

describe('the kinds', () => {
  it('are not assignable to each other', () => {
    expectTypeOf(parameters).not.toExtend<SerializedContractState>();
    expectTypeOf(zswap).not.toExtend<SerializedContractState>();
    expectTypeOf(anyEraState).not.toExtend<SerializedLedgerParameters>();
    expectTypeOf(zswap).not.toExtend<SerializedLedgerParameters>();
    expectTypeOf(anyEraState).not.toExtend<SerializedZswapChainState>();
    expectTypeOf(parameters).not.toExtend<SerializedZswapChainState>();
  });

  it('do not expose the kind', () => {
    expectTypeOf(anyEraState).not.toHaveProperty('kind');
  });
});

describe('the eras', () => {
  it('keep a state of one era from standing for another', () => {
    expectTypeOf(ledger9State).not.toExtend<SerializedContractState<'v8'>>();
    expectTypeOf(ledger8State).not.toExtend<SerializedContractState<'v9'>>();
  });

  it('let a state of one era stand where a state of any era is expected', () => {
    expectTypeOf(ledger9State).toExtend<SerializedContractState>();
    expectTypeOf(ledger8State).toExtend<SerializedContractState>();
  });
});

describe('deserialize', () => {
  it('returns what the decoder of the value era returns', () => {
    expectTypeOf(ledger9State.deserialize({ v9: ledger9Decoder })).toEqualTypeOf<Ledger9ContractState>();
    expectTypeOf(ledger8State.deserialize({ v8: ledger8Decoder })).toEqualTypeOf<Ledger8ContractState>();
    expectTypeOf(parameters.deserialize({ v9: parametersDecoder })).toEqualTypeOf<LedgerParameters>();
    expectTypeOf(zswap.deserialize({ v9: zswapDecoder })).toEqualTypeOf<ZswapChainState>();
  });

  it('returns either era object when the era is not known', () => {
    expectTypeOf(anyEraState.deserialize({ v8: ledger8Decoder, v9: ledger9Decoder })).toEqualTypeOf<
      Ledger8ContractState | Ledger9ContractState
    >();
  });

  it('returns the decoded type when only the current-era decoder is passed for a value of any era', () => {
    expectTypeOf(anyEraState.deserialize({ v9: ledger9Decoder })).toEqualTypeOf<Ledger9ContractState>();
  });

  it('does not compile when the decoders cannot read the value era', () => {
    // @ts-expect-error a v8 value needs a v8 decoder
    ledger8State.deserialize({ v9: ledger9Decoder });
  });

  it('does not compile without a decoder', () => {
    // @ts-expect-error no decoder at all
    ledger9State.deserialize({});
  });

  it('returns the decoded type for a decoder under an optional key', () => {
    expectTypeOf(ledger9State.deserialize(optionalDecoders)).toEqualTypeOf<Ledger9ContractState>();
  });

  it('returns unknown, not never, for decoders typed as StateDecoders', () => {
    expectTypeOf(ledger9State.deserialize(typedDecoders)).toBeUnknown();
  });
});
