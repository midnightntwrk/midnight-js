import { TxFailedError } from '@midnight-ntwrk/midnight-js-contract-core';
import { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

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
