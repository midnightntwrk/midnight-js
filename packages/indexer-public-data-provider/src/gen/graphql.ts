/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  ApplyStage: { input: string; output: string; }
  HexEncoded: { input: string; output: string; }
  Unit: { input: null; output: null; }
  ViewingKey: { input: string; output: string; }
};

/** A block with its relevant data. */
export type Block = {
  /** The block author. */
  author: Maybe<Scalars['HexEncoded']['output']>;
  /** The block hash. */
  hash: Scalars['HexEncoded']['output'];
  /** The block height. */
  height: Scalars['Int']['output'];
  /** The parent of this block. */
  parent: Maybe<Block>;
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The UNIX timestamp. */
  timestamp: Scalars['Int']['output'];
  /** The transactions within this block. */
  transactions: Array<Transaction>;
};

/** Either a hash or a height to query a block. */
export type BlockOffset =
  { hash: Scalars['HexEncoded']['input']; height?: never; }
  |  { hash?: never; height: Scalars['Int']['input']; };

/** A contract action. */
export type ContractAction = {
  address: Scalars['HexEncoded']['output'];
  chainState: Scalars['HexEncoded']['output'];
  state: Scalars['HexEncoded']['output'];
  transaction: Transaction;
};

/** Either a block offset or a transaction offset to query a contract action. */
export type ContractActionOffset =
  { blockOffset: BlockOffset; transactionOffset?: never; }
  |  { blockOffset?: never; transactionOffset: TransactionOffset; };

/** A contract call. */
export type ContractCall = ContractAction & {
  address: Scalars['HexEncoded']['output'];
  chainState: Scalars['HexEncoded']['output'];
  deploy: ContractDeploy;
  entryPoint: Scalars['HexEncoded']['output'];
  state: Scalars['HexEncoded']['output'];
  transaction: Transaction;
};

/** A contract deployment. */
export type ContractDeploy = ContractAction & {
  address: Scalars['HexEncoded']['output'];
  chainState: Scalars['HexEncoded']['output'];
  state: Scalars['HexEncoded']['output'];
  transaction: Transaction;
};

/** A contract update. */
export type ContractUpdate = ContractAction & {
  address: Scalars['HexEncoded']['output'];
  chainState: Scalars['HexEncoded']['output'];
  state: Scalars['HexEncoded']['output'];
  transaction: Transaction;
};

export type MerkleTreeCollapsedUpdate = {
  /** The end index into the zswap state. */
  end: Scalars['Int']['output'];
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The start index into the zswap state. */
  start: Scalars['Int']['output'];
  /** The hex-encoded merkle-tree collapsed update. */
  update: Scalars['HexEncoded']['output'];
};

export type Mutation = {
  /** Connect the wallet with the given viewing key and return a session ID. */
  connect: Scalars['HexEncoded']['output'];
  /** Disconnect the wallet with the given session ID. */
  disconnect: Scalars['Unit']['output'];
};


export type MutationConnectArgs = {
  viewingKey: Scalars['ViewingKey']['input'];
};


export type MutationDisconnectArgs = {
  sessionId: Scalars['HexEncoded']['input'];
};

export type ProgressUpdate = {
  /** The highest end index into the zswap state of all currently known transactions. */
  highestIndex: Scalars['Int']['output'];
  /**
   * The highest end index into the zswap state of all currently known relevant transactions,
   * i.e. such that belong to any wallet. Less or equal `highest_index`.
   */
  highestRelevantIndex: Scalars['Int']['output'];
  /**
   * The highest end index into the zswap state of all currently known relevant transactions for
   * a particular wallet. Less or equal `highest_relevant_index`.
   */
  highestRelevantWalletIndex: Scalars['Int']['output'];
};

export type Query = {
  /** Find a block for the given optional offset; if not present, the latest block is returned. */
  block: Maybe<Block>;
  /** Find a contract action for the given address and optional offset. */
  contractAction: Maybe<ContractAction>;
  /** Find transactions for the given offset. */
  transactions: Array<Transaction>;
};


export type QueryBlockArgs = {
  offset: InputMaybe<BlockOffset>;
};


export type QueryContractActionArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
};


export type QueryTransactionsArgs = {
  offset: TransactionOffset;
};

export type RelevantTransaction = {
  /** The end index. */
  end: Scalars['Int']['output'];
  /** The start index. */
  start: Scalars['Int']['output'];
  /** Relevant transaction for the wallet. */
  transaction: Transaction;
};

export type Subscription = {
  /** Subscribe to blocks. */
  blocks: Block;
  /** Subscribe to contract actions. */
  contractActions: ContractAction;
  /** Subscribe to wallet events. */
  wallet: WalletSyncEvent;
};


export type SubscriptionBlocksArgs = {
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionContractActionsArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionWalletArgs = {
  index: InputMaybe<Scalars['Int']['input']>;
  sendProgressUpdates: InputMaybe<Scalars['Boolean']['input']>;
  sessionId: Scalars['HexEncoded']['input'];
};

/** A transaction with its relevant data. */
export type Transaction = {
  /** The transaction apply stage. */
  applyStage: Scalars['ApplyStage']['output'];
  /** The block for this transaction. */
  block: Block;
  /** The contract actions. */
  contractActions: Array<ContractAction>;
  /** The transaction hash. */
  hash: Scalars['HexEncoded']['output'];
  /** The transaction identifiers. */
  identifiers: Array<Scalars['HexEncoded']['output']>;
  /** The merkle-tree root. */
  merkleTreeRoot: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The raw transaction content. */
  raw: Scalars['HexEncoded']['output'];
};

/** Either a hash or an identifier to query transactions. */
export type TransactionOffset =
  { hash: Scalars['HexEncoded']['input']; identifier?: never; }
  |  { hash?: never; identifier: Scalars['HexEncoded']['input']; };

export type ViewingUpdate = {
  /**
   * Next start index into the zswap state to be queried. Usually the end index of the included
   * relevant transaction plus one unless that is a failure in which case just its end
   * index.
   */
  index: Scalars['Int']['output'];
  /** Relevant transaction for the wallet and maybe a collapsed Merkle-Tree update. */
  update: Array<ZswapChainStateUpdate>;
};

export type WalletSyncEvent = ProgressUpdate | ViewingUpdate;

export type ZswapChainStateUpdate = MerkleTreeCollapsedUpdate | RelevantTransaction;

export type BlockHashQueryQueryVariables = Exact<{
  offset: InputMaybe<BlockOffset>;
}>;


export type BlockHashQueryQuery = { block: { height: number, hash: string } | null };

export type TxIdQueryQueryVariables = Exact<{
  offset: TransactionOffset;
}>;


export type TxIdQueryQuery = { transactions: Array<{ raw: string, applyStage: string, hash: string, block: { height: number, hash: string } }> };

export type DeployTxQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type DeployTxQueryQuery = { contractAction: { deploy: { transaction: { raw: string, applyStage: string, hash: string, identifiers: Array<string>, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string } } } } | { transaction: { raw: string, applyStage: string, hash: string, identifiers: Array<string>, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string } } } | { transaction: { raw: string, applyStage: string, hash: string, identifiers: Array<string>, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string } } } | null };

export type DeployContractStateTxQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type DeployContractStateTxQueryQuery = { contractAction: { deploy: { transaction: { contractActions: Array<{ address: string, state: string } | { address: string, state: string } | { address: string, state: string }> } } } | { state: string } | { state: string } | null };

export type LatestContractTxBlockHeightQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type LatestContractTxBlockHeightQueryQuery = { contractAction: { transaction: { block: { height: number } } } | { transaction: { block: { height: number } } } | { transaction: { block: { height: number } } } | null };

export type TxsFromBlockSubSubscriptionVariables = Exact<{
  offset: InputMaybe<BlockOffset>;
}>;


export type TxsFromBlockSubSubscription = { blocks: { hash: string, height: number, transactions: Array<{ hash: string, identifiers: Array<string>, contractActions: Array<{ state: string, address: string } | { state: string, address: string } | { state: string, address: string }> }> } };

export type ContractStateQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type ContractStateQueryQuery = { contractAction: { state: string } | { state: string } | { state: string } | null };

export type ContractStateSubSubscriptionVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
}>;


export type ContractStateSubSubscription = { contractActions: { state: string } | { state: string } | { state: string } };

export type BothStateQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type BothStateQueryQuery = { contractAction: { state: string, chainState: string } | { state: string, chainState: string } | { state: string, chainState: string } | null };


export const BlockHashQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BLOCK_HASH_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<BlockHashQueryQuery, BlockHashQueryQueryVariables>;
export const TxIdQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TX_ID_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionOffset"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"applyStage"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]}}]} as unknown as DocumentNode<TxIdQueryQuery, TxIdQueryQueryVariables>;
export const DeployTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"applyStage"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"applyStage"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"applyStage"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployTxQueryQuery, DeployTxQueryQueryVariables>;
export const DeployContractStateTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_CONTRACT_STATE_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployContractStateTxQueryQuery, DeployContractStateTxQueryQueryVariables>;
export const LatestContractTxBlockHeightQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]} as unknown as DocumentNode<LatestContractTxBlockHeightQueryQuery, LatestContractTxBlockHeightQueryQueryVariables>;
export const TxsFromBlockSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TXS_FROM_BLOCK_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"transactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxsFromBlockSubSubscription, TxsFromBlockSubSubscriptionVariables>;
export const ContractStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateQueryQuery, ContractStateQueryQueryVariables>;
export const ContractStateSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CONTRACT_STATE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateSubSubscription, ContractStateSubSubscriptionVariables>;
export const BothStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BOTH_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"chainState"}}]}}]}}]} as unknown as DocumentNode<BothStateQueryQuery, BothStateQueryQueryVariables>;