import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             mintValue_0: bigint,
             mintNonce_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                     color: Uint8Array,
                                                                                     value: bigint
                                                                                   }>>;
  sendMinted(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
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
  stampThriceAndMint(context: __compactRuntime.CircuitContext<PS>,
                     seed_0: Uint8Array,
                     domainSep_0: Uint8Array,
                     mintValue_0: bigint,
                     mintNonce_0: Uint8Array,
                     publicKey_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                                        color: Uint8Array,
                                                                                                        value: bigint
                                                                                                      }>>;
}

export type ProvableCircuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             mintValue_0: bigint,
             mintNonce_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                     color: Uint8Array,
                                                                                     value: bigint
                                                                                   }>>;
  sendMinted(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
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
  stampThriceAndMint(context: __compactRuntime.CircuitContext<PS>,
                     seed_0: Uint8Array,
                     domainSep_0: Uint8Array,
                     mintValue_0: bigint,
                     mintNonce_0: Uint8Array,
                     publicKey_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                                        color: Uint8Array,
                                                                                                        value: bigint
                                                                                                      }>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mintToSelf(context: __compactRuntime.CircuitContext<PS>,
             domainSep_0: Uint8Array,
             mintValue_0: bigint,
             mintNonce_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                     color: Uint8Array,
                                                                                     value: bigint
                                                                                   }>>;
  sendMinted(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
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
  stampThriceAndMint(context: __compactRuntime.CircuitContext<PS>,
                     seed_0: Uint8Array,
                     domainSep_0: Uint8Array,
                     mintValue_0: bigint,
                     mintNonce_0: Uint8Array,
                     publicKey_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                                                        color: Uint8Array,
                                                                                                        value: bigint
                                                                                                      }>>;
}

export type Ledger = {
  stamps: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined
  };
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
