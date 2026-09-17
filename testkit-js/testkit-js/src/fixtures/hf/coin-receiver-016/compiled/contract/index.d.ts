import type * as __compactRuntime from 'compact-runtime-ledger8';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  receive_coin(context: __compactRuntime.CircuitContext<PS>,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  receive_coin(context: __compactRuntime.CircuitContext<PS>,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  receive_coin(context: __compactRuntime.CircuitContext<PS>,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly pot: { nonce: Uint8Array,
                  color: Uint8Array,
                  value: bigint,
                  mt_index: bigint
                };
  readonly pot_has_coin: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
