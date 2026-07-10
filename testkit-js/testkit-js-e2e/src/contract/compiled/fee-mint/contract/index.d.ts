import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mintWithUnshieldedFee(context: __compactRuntime.CircuitContext<PS>,
                        domainSep_0: Uint8Array,
                        mintValue_0: bigint,
                        mintNonce_0: Uint8Array,
                        recipient_0: { bytes: Uint8Array },
                        fee_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mintWithShieldedFee(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      recipient_0: { bytes: Uint8Array },
                      feeCoin_0: { nonce: Uint8Array,
                                   color: Uint8Array,
                                   value: bigint
                                 }): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type ProvableCircuits<PS> = {
  mintWithUnshieldedFee(context: __compactRuntime.CircuitContext<PS>,
                        domainSep_0: Uint8Array,
                        mintValue_0: bigint,
                        mintNonce_0: Uint8Array,
                        recipient_0: { bytes: Uint8Array },
                        fee_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mintWithShieldedFee(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      recipient_0: { bytes: Uint8Array },
                      feeCoin_0: { nonce: Uint8Array,
                                   color: Uint8Array,
                                   value: bigint
                                 }): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mintWithUnshieldedFee(context: __compactRuntime.CircuitContext<PS>,
                        domainSep_0: Uint8Array,
                        mintValue_0: bigint,
                        mintNonce_0: Uint8Array,
                        recipient_0: { bytes: Uint8Array },
                        fee_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mintWithShieldedFee(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      recipient_0: { bytes: Uint8Array },
                      feeCoin_0: { nonce: Uint8Array,
                                   color: Uint8Array,
                                   value: bigint
                                 }): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
}

export type Ledger = {
  counters: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { read(): bigint }
  };
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
