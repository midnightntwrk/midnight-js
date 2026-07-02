import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  heavyCheckpointMintAndSend(context: __compactRuntime.CircuitContext<PS>,
                             domainSep_0: Uint8Array,
                             mintValue_0: bigint,
                             mintNonce_0: Uint8Array,
                             publicKey_0: { bytes: Uint8Array },
                             sendValue_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         },
                                                                                                 sent: { nonce: Uint8Array,
                                                                                                         color: Uint8Array,
                                                                                                         value: bigint
                                                                                                       }
                                                                                               }>>;
}

export type ProvableCircuits<PS> = {
  heavyCheckpointMintAndSend(context: __compactRuntime.CircuitContext<PS>,
                             domainSep_0: Uint8Array,
                             mintValue_0: bigint,
                             mintNonce_0: Uint8Array,
                             publicKey_0: { bytes: Uint8Array },
                             sendValue_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         },
                                                                                                 sent: { nonce: Uint8Array,
                                                                                                         color: Uint8Array,
                                                                                                         value: bigint
                                                                                                       }
                                                                                               }>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  heavyCheckpointMintAndSend(context: __compactRuntime.CircuitContext<PS>,
                             domainSep_0: Uint8Array,
                             mintValue_0: bigint,
                             mintNonce_0: Uint8Array,
                             publicKey_0: { bytes: Uint8Array },
                             sendValue_0: bigint): Promise<__compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                                           value: { nonce: Uint8Array,
                                                                                                                    color: Uint8Array,
                                                                                                                    value: bigint
                                                                                                                  }
                                                                                                         },
                                                                                                 sent: { nonce: Uint8Array,
                                                                                                         color: Uint8Array,
                                                                                                         value: bigint
                                                                                                       }
                                                                                               }>>;
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
