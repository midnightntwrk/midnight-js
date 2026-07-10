/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AddressOrContractKind =
  | 'CONTRACT'
  | 'USER'
  | '%future added value';

/** Either a block hash or a block height. */
export type BlockOffset =
  {   /** A hex-encoded block hash. */
  readonly hash: string; readonly height?: never; }
  |  { readonly hash?: never;   /** A block height. */
  readonly height: number; };

/** Either a block offset or a transaction offset. */
export type ContractActionOffset =
  {   /** Either a block hash or a block height. */
  readonly blockOffset: BlockOffset; readonly transactionOffset?: never; }
  |  { readonly blockOffset?: never;   /** Either a transaction hash or a transaction identifier. */
  readonly transactionOffset: TransactionOffset; };

/**
 * Filter for contract events queries and subscriptions. Block-range bounds
 * live here so the same shape works for both (per Andrzej 21 May review).
 */
export type ContractEventFilter = {
  /** Required: the contract address to filter events for. */
  readonly contractAddress: string;
  /** Optional: prefix-match on indexed fields of the event. Standard events only. */
  readonly fieldPrefixes: ReadonlyArray<FieldPrefixFilter> | null | undefined;
  /**
   * Optional: lower bound on the block height an event was emitted in. On
   * subscription, acts as a starting cursor (alternative to `id`).
   */
  readonly fromBlock: number | null | undefined;
  /**
   * Optional: upper bound on the block height an event was emitted in. On
   * subscription, terminates the stream once the chain reaches this block.
   */
  readonly toBlock: number | null | undefined;
  /**
   * Optional: hex-encoded transaction hash; narrows to events emitted from
   * transactions with this hash ("I just submitted tx X, give me its
   * events").
   */
  readonly transactionHash: string | null | undefined;
  /**
   * Optional: filter to a subset of contract event types. Indexer translates
   * to `variant = ANY(...)` against the indexed variant column.
   */
  readonly types: ReadonlyArray<ContractEventType> | null | undefined;
};

/**
 * Closed enum of contract event types the indexer surfaces. Used in filter
 * input only, response discrimination is via `__typename`. Mirrors the
 * 11 variants of `LogEventType` (onchain-vm/src/ops.rs, ledger-9 alpha).
 */
export type ContractEventType =
  | 'MISC'
  | 'PAUSED'
  | 'SHIELDED_BURN'
  | 'SHIELDED_MINT'
  | 'SHIELDED_RECEIVE'
  | 'SHIELDED_SPEND'
  | 'UNPAUSED'
  | 'UNSHIELDED_BURN'
  | 'UNSHIELDED_MINT'
  | 'UNSHIELDED_RECEIVE'
  | 'UNSHIELDED_SPEND'
  | '%future added value';

/**
 * Prefix filter on an indexed field of a standard event. Indexer resolves
 * `fieldName` for all standard events from the variant; no descriptor needed.
 * Not supported on Misc events.
 */
export type FieldPrefixFilter = {
  /**
   * Field name (e.g. `nullifier`, `commitment`, `sender`). Must match an
   * indexed field of the filtered event type.
   */
  readonly fieldName: string;
  /**
   * Hex-encoded prefix bytes. Empty string matches all values; otherwise
   * the indexer returns events whose field value starts with this prefix,
   * client filters to exact match if needed.
   */
  readonly prefix: string;
};

/** Either a transaction hash or a transaction identifier. */
export type TransactionOffset =
  {   /** A hex-encoded transaction hash. */
  readonly hash: string; readonly identifier?: never; }
  |  { readonly hash?: never;   /** A hex-encoded transaction identifier. */
  readonly identifier: string; };

/** The status of the transaction result: success, partial success or failure. */
export type TransactionResultStatus =
  | 'FAILURE'
  | 'PARTIAL_SUCCESS'
  | 'SUCCESS'
  | '%future added value';

export type BlockHashQueryQueryVariables = Exact<{
  offset: BlockOffset | null | undefined;
}>;


export type BlockHashQueryQuery = { readonly block: { readonly height: number, readonly hash: string } | null };

export type TxIdQueryQueryVariables = Exact<{
  offset: TransactionOffset;
}>;


export type TxIdQueryQuery = { readonly transactions: ReadonlyArray<
    | { readonly identifiers: ReadonlyArray<string>, readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly fees: { readonly estimatedFees: string, readonly paidFees: string }, readonly transactionResult: { readonly status: TransactionResultStatus, readonly segments: ReadonlyArray<{ readonly id: number, readonly success: boolean }> | null }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number } }
    | { readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number } }
  > };

export type DeployTxQueryQueryVariables = Exact<{
  address: string;
}>;


export type DeployTxQueryQuery = { readonly contractAction:
    | { readonly deploy: { readonly transaction:
          | { readonly identifiers: ReadonlyArray<string>, readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly fees: { readonly estimatedFees: string, readonly paidFees: string }, readonly transactionResult: { readonly status: TransactionResultStatus, readonly segments: ReadonlyArray<{ readonly id: number, readonly success: boolean }> | null }, readonly contractActions: ReadonlyArray<
              | { readonly address: string }
              | { readonly address: string }
              | { readonly address: string }
            >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
          | { readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly contractActions: ReadonlyArray<
              | { readonly address: string }
              | { readonly address: string }
              | { readonly address: string }
            >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
         } }
    | { readonly transaction:
        | { readonly identifiers: ReadonlyArray<string>, readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly fees: { readonly estimatedFees: string, readonly paidFees: string }, readonly transactionResult: { readonly status: TransactionResultStatus, readonly segments: ReadonlyArray<{ readonly id: number, readonly success: boolean }> | null }, readonly contractActions: ReadonlyArray<
            | { readonly address: string }
            | { readonly address: string }
            | { readonly address: string }
          >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
        | { readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly contractActions: ReadonlyArray<
            | { readonly address: string }
            | { readonly address: string }
            | { readonly address: string }
          >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
       }
    | { readonly transaction:
        | { readonly identifiers: ReadonlyArray<string>, readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly fees: { readonly estimatedFees: string, readonly paidFees: string }, readonly transactionResult: { readonly status: TransactionResultStatus, readonly segments: ReadonlyArray<{ readonly id: number, readonly success: boolean }> | null }, readonly contractActions: ReadonlyArray<
            | { readonly address: string }
            | { readonly address: string }
            | { readonly address: string }
          >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
        | { readonly id: number, readonly protocolVersion: number, readonly raw: string, readonly hash: string, readonly contractActions: ReadonlyArray<
            | { readonly address: string }
            | { readonly address: string }
            | { readonly address: string }
          >, readonly block: { readonly height: number, readonly hash: string, readonly author: string | null, readonly timestamp: number }, readonly unshieldedCreatedOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }>, readonly unshieldedSpentOutputs: ReadonlyArray<{ readonly owner: string, readonly intentHash: string, readonly tokenType: string, readonly value: string }> }
       }
   | null };

export type DeployContractStateTxQueryQueryVariables = Exact<{
  address: string;
}>;


export type DeployContractStateTxQueryQuery = { readonly contractAction:
    | { readonly deploy: { readonly transaction:
          | { readonly contractActions: ReadonlyArray<
              | { readonly address: string, readonly state: string }
              | { readonly address: string, readonly state: string }
              | { readonly address: string, readonly state: string }
            > }
          | { readonly contractActions: ReadonlyArray<
              | { readonly address: string, readonly state: string }
              | { readonly address: string, readonly state: string }
              | { readonly address: string, readonly state: string }
            > }
         } }
    | { readonly state: string }
    | { readonly state: string }
   | null };

export type LatestContractTxBlockHeightQueryQueryVariables = Exact<{
  address: string;
}>;


export type LatestContractTxBlockHeightQueryQuery = { readonly contractAction:
    | { readonly transaction:
        | { readonly block: { readonly height: number } }
        | { readonly block: { readonly height: number } }
       }
    | { readonly transaction:
        | { readonly block: { readonly height: number } }
        | { readonly block: { readonly height: number } }
       }
    | { readonly transaction:
        | { readonly block: { readonly height: number } }
        | { readonly block: { readonly height: number } }
       }
   | null };

export type TxsFromBlockSubSubscriptionVariables = Exact<{
  offset: BlockOffset | null | undefined;
}>;


export type TxsFromBlockSubSubscription = { readonly blocks: { readonly hash: string, readonly height: number, readonly transactions: ReadonlyArray<
      | { readonly identifiers: ReadonlyArray<string>, readonly hash: string, readonly contractActions: ReadonlyArray<
          | { readonly state: string, readonly address: string }
          | { readonly state: string, readonly address: string }
          | { readonly state: string, readonly address: string }
        > }
      | { readonly hash: string, readonly contractActions: ReadonlyArray<
          | { readonly state: string, readonly address: string }
          | { readonly state: string, readonly address: string }
          | { readonly state: string, readonly address: string }
        > }
    > } };

export type ContractStateQueryQueryVariables = Exact<{
  address: string;
  offset: BlockOffset | null | undefined;
}>;


export type ContractStateQueryQuery = { readonly contract: { readonly state: string } | null };

export type ContractStateSubSubscriptionVariables = Exact<{
  address: string;
  offset: BlockOffset | null | undefined;
}>;


export type ContractStateSubSubscription = { readonly contractActions:
    | { readonly state: string }
    | { readonly state: string }
    | { readonly state: string }
   };

export type ContractAndZswapStateQueryQueryVariables = Exact<{
  address: string;
  offset: BlockOffset | null | undefined;
}>;


export type ContractAndZswapStateQueryQuery = { readonly block: { readonly ledgerParameters: string, readonly contractZswapState: string | null } | null, readonly contract: { readonly state: string } | null };

export type UnshieldedBalanceQueryQueryVariables = Exact<{
  address: string;
}>;


export type UnshieldedBalanceQueryQuery = { readonly contractAction:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   | null };

export type QueryUnshieldedBalancesWithOffsetQueryVariables = Exact<{
  address: string;
  offset: ContractActionOffset | null | undefined;
}>;


export type QueryUnshieldedBalancesWithOffsetQuery = { readonly contractAction:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   | null };

export type UnshieldedBalanceSubSubscriptionVariables = Exact<{
  address: string;
  offset: BlockOffset | null | undefined;
}>;


export type UnshieldedBalanceSubSubscription = { readonly contractActions:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   };

export type ContractEventsQueryQueryVariables = Exact<{
  filter: ContractEventFilter;
  limit: number | null | undefined;
  offset: number | null | undefined;
}>;


export type ContractEventsQueryQuery = { readonly contractEvents: ReadonlyArray<
    | { readonly __typename: 'MiscContractEvent', readonly name: string, readonly payload: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'PausedEvent', readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'ShieldedBurnEvent', readonly nullifier: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly shieldedAmount: string | null }
    | { readonly __typename: 'ShieldedMintEvent', readonly commitment: string, readonly domainSep: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly shieldedAmount: string | null }
    | { readonly __typename: 'ShieldedReceiveEvent', readonly commitment: string, readonly ciphertext: string | null, readonly receivingContractAddress: string | null, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'ShieldedSpendEvent', readonly nullifier: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnpausedEvent', readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnshieldedBurnEvent', readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly sender: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
    | { readonly __typename: 'UnshieldedMintEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnshieldedReceiveEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly recipient: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
    | { readonly __typename: 'UnshieldedSpendEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly sender: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
  > };

export type ContractEventsSubSubscriptionVariables = Exact<{
  filter: ContractEventFilter;
  id: number | null | undefined;
}>;


export type ContractEventsSubSubscription = { readonly contractEvents:
    | { readonly __typename: 'MiscContractEvent', readonly name: string, readonly payload: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'PausedEvent', readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'ShieldedBurnEvent', readonly nullifier: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly shieldedAmount: string | null }
    | { readonly __typename: 'ShieldedMintEvent', readonly commitment: string, readonly domainSep: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly shieldedAmount: string | null }
    | { readonly __typename: 'ShieldedReceiveEvent', readonly commitment: string, readonly ciphertext: string | null, readonly receivingContractAddress: string | null, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'ShieldedSpendEvent', readonly nullifier: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnpausedEvent', readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnshieldedBurnEvent', readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly sender: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
    | { readonly __typename: 'UnshieldedMintEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string }
    | { readonly __typename: 'UnshieldedReceiveEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly recipient: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
    | { readonly __typename: 'UnshieldedSpendEvent', readonly domainSep: string, readonly tokenType: string, readonly amount: string, readonly id: number, readonly maxId: number, readonly version: number, readonly contractAddress: string, readonly transactionId: number, readonly raw: string, readonly sender: { readonly kind: AddressOrContractKind, readonly userAddress: string | null, readonly contractAddress: string | null } }
   };


export const BlockHashQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BLOCK_HASH_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<BlockHashQueryQuery, BlockHashQueryQueryVariables>;
export const TxIdQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TX_ID_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionOffset"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxIdQueryQuery, TxIdQueryQueryVariables>;
export const DeployTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployTxQueryQuery, DeployTxQueryQueryVariables>;
export const DeployContractStateTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_CONTRACT_STATE_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployContractStateTxQueryQuery, DeployContractStateTxQueryQueryVariables>;
export const LatestContractTxBlockHeightQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]} as unknown as DocumentNode<LatestContractTxBlockHeightQueryQuery, LatestContractTxBlockHeightQueryQueryVariables>;
export const TxsFromBlockSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TXS_FROM_BLOCK_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"transactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxsFromBlockSubSubscription, TxsFromBlockSubSubscriptionVariables>;
export const ContractStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contract"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateQueryQuery, ContractStateQueryQueryVariables>;
export const ContractStateSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CONTRACT_STATE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateSubSubscription, ContractStateSubSubscriptionVariables>;
export const ContractAndZswapStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_AND_ZSWAP_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerParameters"}},{"kind":"Field","name":{"kind":"Name","value":"contractZswapState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}]}]}},{"kind":"Field","name":{"kind":"Name","value":"contract"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractAndZswapStateQueryQuery, ContractAndZswapStateQueryQueryVariables>;
export const UnshieldedBalanceQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceQueryQuery, UnshieldedBalanceQueryQueryVariables>;
export const QueryUnshieldedBalancesWithOffsetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QUERY_UNSHIELDED_BALANCES_WITH_OFFSET"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<QueryUnshieldedBalancesWithOffsetQuery, QueryUnshieldedBalancesWithOffsetQueryVariables>;
export const UnshieldedBalanceSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceSubSubscription, UnshieldedBalanceSubSubscriptionVariables>;
export const ContractEventsQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_EVENTS_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractEventFilter"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxId"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}},{"kind":"Field","name":{"kind":"Name","value":"transactionId"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedSpendEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nullifier"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedReceiveEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commitment"}},{"kind":"Field","name":{"kind":"Name","value":"ciphertext"}},{"kind":"Field","name":{"kind":"Name","value":"receivingContractAddress"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedMintEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commitment"}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","alias":{"kind":"Name","value":"shieldedAmount"},"name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedBurnEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nullifier"}},{"kind":"Field","alias":{"kind":"Name","value":"shieldedAmount"},"name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedSpendEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sender"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedReceiveEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recipient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedMintEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedBurnEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sender"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MiscContractEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}}]}}]}}]}}]} as unknown as DocumentNode<ContractEventsQueryQuery, ContractEventsQueryQueryVariables>;
export const ContractEventsSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CONTRACT_EVENTS_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractEventFilter"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maxId"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}},{"kind":"Field","name":{"kind":"Name","value":"transactionId"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedSpendEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nullifier"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedReceiveEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commitment"}},{"kind":"Field","name":{"kind":"Name","value":"ciphertext"}},{"kind":"Field","name":{"kind":"Name","value":"receivingContractAddress"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedMintEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commitment"}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","alias":{"kind":"Name","value":"shieldedAmount"},"name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ShieldedBurnEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nullifier"}},{"kind":"Field","alias":{"kind":"Name","value":"shieldedAmount"},"name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedSpendEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sender"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedReceiveEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recipient"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedMintEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"domainSep"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UnshieldedBurnEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sender"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"userAddress"}},{"kind":"Field","name":{"kind":"Name","value":"contractAddress"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MiscContractEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"payload"}}]}}]}}]}}]} as unknown as DocumentNode<ContractEventsSubSubscription, ContractEventsSubSubscriptionVariables>;