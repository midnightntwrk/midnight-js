import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             color_0: Uint8Array,
             amount_0: bigint,
             address_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  balanceOf(context: __compactRuntime.CircuitContext<PS>, color_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
}

export type ProvableCircuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             color_0: Uint8Array,
             amount_0: bigint,
             address_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  balanceOf(context: __compactRuntime.CircuitContext<PS>, color_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             color_0: Uint8Array,
             amount_0: bigint,
             address_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  balanceOf(context: __compactRuntime.CircuitContext<PS>, color_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
}

export type Ledger = {
}

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
export declare const circuitSignatures: __compactRuntime.CircuitSignatures;
export declare const declaredInterfaces: __compactRuntime.DeclaredInterfaces;
