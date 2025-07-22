/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { gql } from './gen';

export const BLOCK_QUERY = gql(
  `
  query BLOCK_HASH_QUERY($offset: BlockOffset) {
    block(offset: $offset) {
      height
      hash
    }
  }`
);

export const TX_ID_QUERY = gql(
  `
  query TX_ID_QUERY($offset: TransactionOffset!) {
    transactions(offset: $offset) {
      raw
      hash
      unshieldedCreatedOutputs {
        owner
        intentHash
        tokenType
        value
      }
      unshieldedSpentOutputs {
        owner
        intentHash
        tokenType
        value
      }
      block {
        height
        hash
      }
      transactionResult {
        status
        segments {
          id
          success
        }
      }
    }
  }`
);

export const DEPLOY_TX_QUERY = gql(
  `
  query DEPLOY_TX_QUERY($address: HexEncoded!) {
    contractAction(address: $address) {
      ... on ContractDeploy {
        transaction {
	        raw
          hash
          identifiers
          contractActions {
            address
          }
          block {
            height
            hash
          }
          transactionResult {
            status
            segments {
              id
              success
            }
          }
          unshieldedCreatedOutputs {
            owner
            intentHash
            tokenType
            value
          }
          unshieldedSpentOutputs {
            owner
            intentHash
            tokenType
            value
          }
        }
      }
      ... on ContractUpdate {
        transaction {
	        raw
          hash
          identifiers
          contractActions {
            address
          }
          block {
            height
            hash
          }
          transactionResult {
            status
            segments {
              id
              success
            }
          }
          unshieldedCreatedOutputs {
            owner
            intentHash
            tokenType
            value
          }
          unshieldedSpentOutputs {
            owner
            intentHash
            tokenType
            value
          }
        }
      }
      ... on ContractCall {
        deploy {
          transaction {
	          raw
            hash
            identifiers
            contractActions {
              address
            }
            block {
              height
              hash
            }
            transactionResult {
              status
              segments {
                id
                success
              }
            }
            unshieldedCreatedOutputs {
              owner
              intentHash
              tokenType
              value
            }
            unshieldedSpentOutputs {
              owner
              intentHash
              tokenType
              value
            }
          }
        }
      }
    }
  }`
);

export const DEPLOY_CONTRACT_STATE_TX_QUERY = gql(
  `
  query DEPLOY_CONTRACT_STATE_TX_QUERY($address: HexEncoded!) {
    contractAction(address: $address) {
      ... on ContractDeploy {
        state
      }
      ... on ContractUpdate {
        state
      }
      ... on ContractCall {
        deploy {
          transaction {
            contractActions {
              address
              state
            }
          }
        }
      }
    }
  }`
);


export const LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY = gql(
  `
  query LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY($address: HexEncoded!) {
    contractAction(address: $address) {
      transaction {
        block {
          height
        }
      }
    }
  }`
);

export const TXS_FROM_BLOCK_SUB = gql(
  `
  subscription TXS_FROM_BLOCK_SUB($offset: BlockOffset) {
    blocks(offset: $offset) {
      hash,
      height,
      transactions {
        hash
        identifiers
        contractActions {
          state
          address
        }
      }
    }
  }`
);

export const CONTRACT_STATE_QUERY = gql(
  `
  query CONTRACT_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) {
    contractAction(address: $address, offset: $offset) {
      state
    }
  }`
);

export const CONTRACT_STATE_SUB = gql(
  `
  subscription CONTRACT_STATE_SUB($address: HexEncoded!, $offset: BlockOffset) {
    contractActions(address: $address, offset: $offset) {
      state
    }
  }`
);

export const CONTRACT_AND_ZSWAP_STATE_QUERY = gql(
  `
  query BOTH_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) {
    contractAction(address: $address, offset: $offset) {
      state
      chainState
    }
  }`
);

export const UNSHIELDED_BALANCE_QUERY = gql(
  `
  query UNSHIELDED_BALANCE_QUERY($address: HexEncoded!) {
    contractAction(address: $address) {
      ... on ContractDeploy {
        unshieldedBalances {
          tokenType
          amount
        }
      }
      ... on ContractUpdate {
        unshieldedBalances {
          tokenType
          amount
        }
      }
      ... on ContractCall {
        deploy {
          unshieldedBalances {
            tokenType
            amount
          }
        }
      }
    }
  }`
);

export const UNSHIELDED_BALANCE_SUB = gql(
  `
  subscription UNSHIELDED_BALANCE_SUB($address: HexEncoded!, $offset: BlockOffset) {
    contractActions(address: $address, offset: $offset) {
      ... on ContractDeploy {
        unshieldedBalances {
          tokenType
          amount
        }
      }
      ... on ContractUpdate {
        unshieldedBalances {
          tokenType
          amount
        }
      }
      ... on ContractCall {
        deploy {
          unshieldedBalances {
            tokenType
            amount
          }
        }
      }
    }
  }`
);
