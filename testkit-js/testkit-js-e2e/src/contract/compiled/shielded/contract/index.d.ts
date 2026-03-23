import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mintShieldedTokens(context: __compactRuntime.CircuitContext<PS>,
                     domainSep_0: Uint8Array,
                     amount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  mintAndSendShielded(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      publicKey_0: { bytes: Uint8Array },
                      sendValue_0: bigint): __compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                            value: { nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   }
                                                                                          },
                                                                                  sent: { nonce: Uint8Array,
                                                                                          color: Uint8Array,
                                                                                          value: bigint
                                                                                        }
                                                                                }>;
  depositShielded(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  mintShieldedTokens(context: __compactRuntime.CircuitContext<PS>,
                     domainSep_0: Uint8Array,
                     amount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  mintAndSendShielded(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      publicKey_0: { bytes: Uint8Array },
                      sendValue_0: bigint): __compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                            value: { nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   }
                                                                                          },
                                                                                  sent: { nonce: Uint8Array,
                                                                                          color: Uint8Array,
                                                                                          value: bigint
                                                                                        }
                                                                                }>;
  depositShielded(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mintShieldedTokens(context: __compactRuntime.CircuitContext<PS>,
                     domainSep_0: Uint8Array,
                     amount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  mintAndSendShielded(context: __compactRuntime.CircuitContext<PS>,
                      domainSep_0: Uint8Array,
                      mintValue_0: bigint,
                      mintNonce_0: Uint8Array,
                      publicKey_0: { bytes: Uint8Array },
                      sendValue_0: bigint): __compactRuntime.CircuitResults<PS, { change: { is_some: boolean,
                                                                                            value: { nonce: Uint8Array,
                                                                                                     color: Uint8Array,
                                                                                                     value: bigint
                                                                                                   }
                                                                                          },
                                                                                  sent: { nonce: Uint8Array,
                                                                                          color: Uint8Array,
                                                                                          value: bigint
                                                                                        }
                                                                                }>;
  depositShielded(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
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
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
