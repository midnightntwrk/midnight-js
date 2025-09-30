import { ContractState, type QueryContext, signatureVerifyingKey, type SigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  ContractMaintenanceAuthority,
  ContractState as LedgerContractState,
  QueryContext as LedgerQueryContext,
  StateValue as LedgerStateValue
} from '@midnight-ntwrk/ledger';
import { getLedgerNetworkId, getRuntimeNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ImpureCircuitId, VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

export const toLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize(getRuntimeNetworkId()), getLedgerNetworkId());

export const fromLedgerContractState = (contractState: LedgerContractState): ContractState =>
  ContractState.deserialize(contractState.serialize(getLedgerNetworkId()), getRuntimeNetworkId());

export const toLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext => {
  const ledgerQueryContext = new LedgerQueryContext(LedgerStateValue.decode(queryContext.state.encode()), queryContext.address);
  // The above method of converting to ledger query context only retains the state. So, we have to set the settable properties manually
  ledgerQueryContext.block = queryContext.block;
  ledgerQueryContext.effects = queryContext.effects;
  return ledgerQueryContext;
}

export const addVerifierKeys = (verifierKeys: [ImpureCircuitId, VerifierKey][], contractState: LedgerContractState): void => {
  verifierKeys.forEach(([impureCircuitId, verifierKey]) => {
    const operation = contractState.operation(impureCircuitId);
    assertDefined(
      operation,
      `Circuit '${impureCircuitId}' is undefined for contract state ${contractState.toString(false)}`
    );
    // TODO: Remove mutability
    operation.verifierKey = verifierKey;
    contractState.setOperation(impureCircuitId, operation);
  });
};

export const contractMaintenanceAuthority = (
  sk: SigningKey,
  contractState?: ContractState
): ContractMaintenanceAuthority => {
  const svk = signatureVerifyingKey(sk);
  const threshold = 1;
  return new ContractMaintenanceAuthority(
    [svk],
    threshold,
    contractState ? contractState.maintenanceAuthority.counter + 1n : 0n
  );
};

export const addMaintenanceAuthority = (sk: SigningKey, contractState: LedgerContractState): void => {
  contractState.maintenanceAuthority = contractMaintenanceAuthority(sk);
};
