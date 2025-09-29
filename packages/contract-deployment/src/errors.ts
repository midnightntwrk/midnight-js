import { type ContractState } from '@midnight-ntwrk/compact-runtime';
import { TxFailedError } from '@midnight-ntwrk/midnight-js-contract-core';
import { type FinalizedTxData, type ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';

/**
 * An error indicating that a deploy transaction was not successfully applied by the consensus node.
 */
export class DeployTxFailedError extends TxFailedError {
  /**
   * @param finalizedTxData The finalization data of the deployment transaction that failed.
   */
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'DeployTxFailedError';
  }
}

/**
 * The error that is thrown when there is a contract type mismatch between a given contract type,
 * and the initial state that is deployed at a given contract address.
 *
 * @remarks
 * This error is typically thrown during calls to {@link findDeployedContract} where the supplied contract
 * address represents a different type of contract to the contract type given.
 */
export class ContractTypeError extends TypeError {
  /**
   * Initializes a new {@link ContractTypeError}.
   *
   * @param contractState The initial deployed contract state.
   * @param circuitIds The circuits that are undefined, or have a verifier key mismatch with the
   *                   key present in `contractState`.
   */
  constructor(
    readonly contractState: ContractState,
    readonly circuitIds: ImpureCircuitId[]
  ) {
    super(
      `Following operations: ${circuitIds.join(
        ', '
      )}, are undefined or have mismatched verifier keys for contract state ${contractState.toString(false)}`
    );
  }
}

/**
 * An error indicating that an initial private state was specified for a contract find while a
 * private state ID was not. We can't store the initial private state if we don't have a private state ID,
 * and we need to let the user know that.
 */
export class IncompleteFindContractPrivateStateConfig extends Error {
  constructor() {
    super('Incorrect find contract configuration');
    this.message = "'initialPrivateState' was defined for contract find while 'privateStateId' was undefined";
  }
}
