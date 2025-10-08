/* eslint-disable @typescript-eslint/consistent-type-definitions */

export const contractId = 'AuthCell';
export type ContractId = typeof contractId;

export type PrivateStates = {
  [contractId]: unknown;
}
