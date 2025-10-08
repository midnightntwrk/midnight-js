import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
import * as __AuthCell from '../../auth-cell/contract/index.cjs';

/* eslint-disable @typescript-eslint/consistent-type-definitions */

export const contractId = 'AuthCellUser';
export type ContractId = typeof contractId;

export type Witnesses<PS> = {
  getUserSk(context: __compactRuntime.WitnessContext<Ledger, PS>): readonly [PS, bigint];
}

export type PrivateStates = {
  [contractId]: unknown;
  [__AuthCell.contractId]: unknown;
}

export type WitnessSets<PSS extends PrivateStates = PrivateStates> = {
  [contractId]: Witnesses<PSS[ContractId]>;
  [__AuthCell.contractId]: __AuthCell.Witnesses<PSS[__AuthCell.ContractId]>;
}

export type InferredPrivateStates<W extends WitnessSets> = W extends WitnessSets<{
  [__AuthCell.contractId]: infer PS_0;
  [contractId]: infer PS_1;
}> ? {
  [__AuthCell.contractId]: PS_0;
  [contractId]: PS_1;
} : never;

export type ImpureCircuits = {
  useAuthCell<PSS>(context: __compactRuntime.CircuitContext<PSS>,
                   x_0: bigint,
                   str_0: string): __compactRuntime.CircuitResults<PSS, bigint>;
}

export type Circuits = {
  useAuthCell<PSS>(context: __compactRuntime.CircuitContext<PSS>,
                   x_0: bigint,
                   str_0: string): __compactRuntime.CircuitResults<PSS, bigint>;
}

export type Ledger = {
  readonly authCell: { bytes: Uint8Array };
}

export type LedgerStateDecoder = (state: __compactRuntime.StateValue) => Ledger;

export type StateConstructor<PS> =
  (context: __compactRuntime.ConstructorContext<PS>,
  authCellParam_0: { bytes: Uint8Array },
  rankingParam_0: { bytes: Uint8Array }) => __compactRuntime.ConstructorResult<PS>;

export type Executables<PSS extends PrivateStates = PrivateStates> = {
  readonly contractId: ContractId;
  readonly witnessSets: WitnessSets<PSS>;
  readonly impureCircuits: ImpureCircuits;
  readonly pureCircuits: PureCircuits;
  readonly circuits: Circuits;
  readonly stateConstructor: StateConstructor<PSS[ContractId]>;
  readonly ledgerStateDecoder: LedgerStateDecoder;
  readonly contractReferenceLocations: __compactRuntime.ContractReferenceLocations;
}

export type ExecutablesBuilder = <W extends WitnessSets>(witnessSets: W) => Executables<InferredPrivateStates<W>>;

export declare const contractReferenceLocations: __compactRuntime.ContractReferenceLocations;
export declare const pureCircuits: PureCircuits;
export declare const ledgerStateDecoder: LedgerStateDecoder;
export declare const executables: ExecutablesBuilder;
