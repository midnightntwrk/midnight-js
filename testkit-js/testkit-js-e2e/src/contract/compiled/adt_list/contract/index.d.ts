import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  mint_coins_for_test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  mint_coins_only_test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  test_coin_operations(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  mint_coins_for_test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  mint_coins_only_test(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  test_coin_operations(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  list: {
    isEmpty(): boolean;
    length(): bigint;
    head(): { is_some: boolean, value: bigint };
    [Symbol.iterator](): Iterator<bigint>
  };
  readonly length: bigint;
  readonly is_empty: boolean;
  readonly head_value: { is_some: boolean, value: bigint };
  readonly length_after_pop: bigint;
  readonly new_head: { is_some: boolean, value: bigint };
  readonly final_empty: boolean;
  readonly final_length: bigint;
  readonly final_head: { is_some: boolean, value: bigint };
  coin_list: {
    isEmpty(): boolean;
    length(): bigint;
    head(): { is_some: boolean,
              value: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }
            };
    [Symbol.iterator](): Iterator<{ nonce: Uint8Array, color: Uint8Array, value: bigint, mt_index: bigint }>
  };
  readonly coin_length: bigint;
  readonly coin_head: { is_some: boolean,
                        value: { nonce: Uint8Array,
                                 color: Uint8Array,
                                 value: bigint,
                                 mt_index: bigint
                               }
                      };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
