import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  emitMisc(context: __compactRuntime.CircuitContext<PS>,
           name_0: Uint8Array,
           payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                    nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedMint(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                      tokenType_0: Uint8Array,
                      amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                        tokenType_0: Uint8Array,
                        amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedMint(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitLifecycle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  emitMisc(context: __compactRuntime.CircuitContext<PS>,
           name_0: Uint8Array,
           payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                    nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedMint(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                      tokenType_0: Uint8Array,
                      amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                        tokenType_0: Uint8Array,
                        amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedMint(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitLifecycle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  emitMisc(context: __compactRuntime.CircuitContext<PS>,
           name_0: Uint8Array,
           payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                    nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedMint(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitShieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedSpend(context: __compactRuntime.CircuitContext<PS>,
                      tokenType_0: Uint8Array,
                      amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedReceive(context: __compactRuntime.CircuitContext<PS>,
                        tokenType_0: Uint8Array,
                        amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedMint(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitUnshieldedBurn(context: __compactRuntime.CircuitContext<PS>,
                     tokenType_0: Uint8Array,
                     amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  emitLifecycle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

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
