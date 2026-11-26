import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  nextStamp(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  step(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  count(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  fillOne(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillTwo(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillThree(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  step(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  count(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  fillOne(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillTwo(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillThree(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  step(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  count(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  fillOne(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillTwo(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  fillThree(context: __compactRuntime.CircuitContext<PS>, seed_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly last: bigint;
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
