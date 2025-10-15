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
  HexEncoded: { input: string; output: string; }
  Unit: { input: null; output: null; }
  UnshieldedAddress: { input: string; output: string; }
  ViewingKey: { input: string; output: string; }
};

/** A block with its relevant data. */
export type Block = {
  /** The hex-encoded block author. */
  author: Maybe<Scalars['HexEncoded']['output']>;
  /** The block hash. */
  hash: Scalars['HexEncoded']['output'];
  /** The block height. */
  height: Scalars['Int']['output'];
  /** The hex-encoded ledger parameters for this block. */
  ledgerParameters: Scalars['HexEncoded']['output'];
  /** The parent of this block. */
  parent: Maybe<Block>;
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The UNIX timestamp. */
  timestamp: Scalars['Int']['output'];
  /** The transactions within this block. */
  transactions: Array<Transaction>;
};

/** Either a block hash or a block height. */
export type BlockOffset =
  /** A hex-encoded block hash. */
  { hash: Scalars['HexEncoded']['input']; height?: never; }
  |  /** A block height. */
  { hash?: never; height: Scalars['Int']['input']; };

export type CollapsedMerkleTree = {
  /** The zswap state end index. */
  endIndex: Scalars['Int']['output'];
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The zswap state start index. */
  startIndex: Scalars['Int']['output'];
  /** The hex-encoded value. */
  update: Scalars['HexEncoded']['output'];
};

/** A contract action. */
export type ContractAction = {
  address: Scalars['HexEncoded']['output'];
  chainState: Scalars['HexEncoded']['output'];
  state: Scalars['HexEncoded']['output'];
  transaction: Transaction;
  unshieldedBalances: Array<ContractBalance>;
};

/** Either a block offset or a transaction offset. */
export type ContractActionOffset =
  /** Either a block hash or a block height. */
  { blockOffset: BlockOffset; transactionOffset?: never; }
  |  /** Either a transaction hash or a transaction identifier. */
  { blockOffset?: never; transactionOffset: TransactionOffset; };

/**
 * Represents a token balance held by a contract.
 * This type is exposed through the GraphQL API to allow clients to query
 * unshielded token balances for any contract action (Deploy, Call, Update).
 */
export type ContractBalance = {
  /** Balance amount as string to support larger integer values (up to 16 bytes). */
  amount: Scalars['String']['output'];
  /** Hex-encoded token type identifier. */
  tokenType: Scalars['HexEncoded']['output'];
};

/** A contract call. */
export type ContractCall = ContractAction & {
  /** The hex-encoded serialized address. */
  address: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized contract-specific zswap state. */
  chainState: Scalars['HexEncoded']['output'];
  /** Contract deploy for this contract call. */
  deploy: ContractDeploy;
  /** The entry point. */
  entryPoint: Scalars['String']['output'];
  /** The hex-encoded serialized state. */
  state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract call. */
  transaction: Transaction;
  /** Unshielded token balances held by this contract. */
  unshieldedBalances: Array<ContractBalance>;
};

/** A contract deployment. */
export type ContractDeploy = ContractAction & {
  /** The hex-encoded serialized address. */
  address: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized contract-specific zswap state. */
  chainState: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized state. */
  state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract deploy. */
  transaction: Transaction;
  /** Unshielded token balances held by this contract. */
  unshieldedBalances: Array<ContractBalance>;
};

/** A contract update. */
export type ContractUpdate = ContractAction & {
  /** The hex-encoded serialized address. */
  address: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized contract-specific zswap state. */
  chainState: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized state. */
  state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract update. */
  transaction: Transaction;
  /** Unshielded token balances held by this contract after the update. */
  unshieldedBalances: Array<ContractBalance>;
};

export type DustGenerationDtimeUpdate = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  maxId: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  raw: Scalars['HexEncoded']['output'];
};

/** DUST generation status for a specific Cardano stake key. */
export type DustGenerationStatus = {
  /** The hex-encoded Cardano stake key. */
  cardanoStakeKey: Scalars['HexEncoded']['output'];
  /** Current DUST capacity. */
  currentCapacity: Scalars['String']['output'];
  /** The hex-encoded associated DUST address if registered. */
  dustAddress: Maybe<Scalars['HexEncoded']['output']>;
  /** Generation rate in Specks per second. */
  generationRate: Scalars['String']['output'];
  /** NIGHT balance backing generation. */
  nightBalance: Scalars['String']['output'];
  /** Whether this stake key is registered. */
  registered: Scalars['Boolean']['output'];
};

export type DustInitialUtxo = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  maxId: Scalars['Int']['output'];
  /** The dust output. */
  output: DustOutput;
  /** The hex-encoded serialized event. */
  raw: Scalars['HexEncoded']['output'];
};

/** A dust related ledger event. */
export type DustLedgerEvent = {
  id: Scalars['Int']['output'];
  maxId: Scalars['Int']['output'];
  raw: Scalars['HexEncoded']['output'];
};

/** A dust output. */
export type DustOutput = {
  /** The hex-encoded 32-byte nonce. */
  nonce: Scalars['HexEncoded']['output'];
};

export type DustSpendProcessed = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  maxId: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  raw: Scalars['HexEncoded']['output'];
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

export type ParamChange = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  maxId: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  raw: Scalars['HexEncoded']['output'];
};

export type Query = {
  /** Find a block for the given optional offset; if not present, the latest block is returned. */
  block: Maybe<Block>;
  /** Find a contract action for the given address and optional offset. */
  contractAction: Maybe<ContractAction>;
  /** Get DUST generation status for specific Cardano stake keys. */
  dustGenerationStatus: Array<DustGenerationStatus>;
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


export type QueryDustGenerationStatusArgs = {
  cardanoStakeKeys: Array<Scalars['HexEncoded']['input']>;
};


export type QueryTransactionsArgs = {
  offset: TransactionOffset;
};

/** A regular Midnight transaction. */
export type RegularTransaction = Transaction & {
  /** The block for this transaction. */
  block: Block;
  /** The contract actions for this transaction. */
  contractActions: Array<ContractAction>;
  /** Dust ledger events of this transaction. */
  dustLedgerEvents: Array<DustLedgerEvent>;
  /** The zswap state end index. */
  endIndex: Scalars['Int']['output'];
  /** Fee information for this transaction. */
  fees: TransactionFees;
  /** The hex-encoded transaction hash. */
  hash: Scalars['HexEncoded']['output'];
  /** The transaction ID. */
  id: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction identifiers. */
  identifiers: Array<Scalars['HexEncoded']['output']>;
  /** The hex-encoded serialized merkle-tree root. */
  merkleTreeRoot: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction content. */
  raw: Scalars['HexEncoded']['output'];
  /** The zswap state start index. */
  startIndex: Scalars['Int']['output'];
  /** The result of applying this transaction to the ledger state. */
  transactionResult: TransactionResult;
  /** Unshielded UTXOs created by this transaction. */
  unshieldedCreatedOutputs: Array<UnshieldedUtxo>;
  /** Unshielded UTXOs spent (consumed) by this transaction. */
  unshieldedSpentOutputs: Array<UnshieldedUtxo>;
  /** Zswap ledger events of this transaction. */
  zswapLedgerEvents: Array<ZswapLedgerEvent>;
};

/** A transaction relevant for the subscribing wallet and an optional collapsed merkle tree. */
export type RelevantTransaction = {
  /** An optional collapsed merkle tree. */
  collapsedMerkleTree: Maybe<CollapsedMerkleTree>;
  /** A transaction relevant for the subscribing wallet. */
  transaction: RegularTransaction;
};

/**
 * One of many segments for a partially successful transaction result showing success for some
 * segment.
 */
export type Segment = {
  /** Segment ID. */
  id: Scalars['Int']['output'];
  /** Successful or not. */
  success: Scalars['Boolean']['output'];
};

/** An event of the shielded transactions subscription. */
export type ShieldedTransactionsEvent = RelevantTransaction | ShieldedTransactionsProgress;

/** Information about the shielded transactions indexing progress. */
export type ShieldedTransactionsProgress = {
  /**
   * The highest zswap state end index (see `endIndex` of `Transaction`) of all transactions
   * checked for relevance. Initially less than and eventually (when some wallet has been fully
   * indexed) equal to `highest_end_index`. A value of zero (very unlikely) means that no wallet
   * has subscribed before and indexing for the subscribing wallet has not yet started.
   */
  highestCheckedEndIndex: Scalars['Int']['output'];
  /**
   * The highest zswap state end index (see `endIndex` of `Transaction`) of all transactions. It
   * represents the known state of the blockchain. A value of zero (completely unlikely) means
   * that no shielded transactions have been indexed yet.
   */
  highestEndIndex: Scalars['Int']['output'];
  /**
   * The highest zswap state end index (see `endIndex` of `Transaction`) of all relevant
   * transactions for the subscribing wallet. Usually less than `highest_checked_end_index`
   * unless the latest checked transaction is relevant for the subscribing wallet. A value of
   * zero means that no relevant transactions have been indexed for the subscribing wallet.
   */
  highestRelevantEndIndex: Scalars['Int']['output'];
};

export type Subscription = {
  /**
   * Subscribe to blocks starting at the given offset or at the latest block if the offset is
   * omitted.
   */
  blocks: Block;
  /**
   * Subscribe to contract actions with the given address starting at the given offset or at the
   * latest block if the offset is omitted.
   */
  contractActions: ContractAction;
  /** Subscribe to dust ledger events starting at the given ID or at the very start if omitted. */
  dustLedgerEvents: DustLedgerEvent;
  /**
   * Subscribe to shielded transaction events for the given session ID starting at the given
   * index or at zero if omitted.
   */
  shieldedTransactions: ShieldedTransactionsEvent;
  /**
   * Subscribe unshielded transaction events for the given address and the given transaction ID
   * or zero if omitted.
   */
  unshieldedTransactions: UnshieldedTransactionsEvent;
  /** Subscribe to zswap ledger events starting at the given ID or at the very start if omitted. */
  zswapLedgerEvents: ZswapLedgerEvent;
};


export type SubscriptionBlocksArgs = {
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionContractActionsArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionDustLedgerEventsArgs = {
  id: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionShieldedTransactionsArgs = {
  index: InputMaybe<Scalars['Int']['input']>;
  sessionId: Scalars['HexEncoded']['input'];
};


export type SubscriptionUnshieldedTransactionsArgs = {
  address: Scalars['UnshieldedAddress']['input'];
  transactionId: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionZswapLedgerEventsArgs = {
  id: InputMaybe<Scalars['Int']['input']>;
};

/** A system Midnight transaction. */
export type SystemTransaction = Transaction & {
  /** The block for this transaction. */
  block: Block;
  /** The contract actions for this transaction. */
  contractActions: Array<ContractAction>;
  /** Dust ledger events of this transaction. */
  dustLedgerEvents: Array<DustLedgerEvent>;
  /** The hex-encoded transaction hash. */
  hash: Scalars['HexEncoded']['output'];
  /** The transaction ID. */
  id: Scalars['Int']['output'];
  /** The protocol version. */
  protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction content. */
  raw: Scalars['HexEncoded']['output'];
  /** Unshielded UTXOs created by this transaction. */
  unshieldedCreatedOutputs: Array<UnshieldedUtxo>;
  /** Unshielded UTXOs spent (consumed) by this transaction. */
  unshieldedSpentOutputs: Array<UnshieldedUtxo>;
  /** Zswap ledger events of this transaction. */
  zswapLedgerEvents: Array<ZswapLedgerEvent>;
};

/** A Midnight transaction. */
export type Transaction = {
  block: Block;
  contractActions: Array<ContractAction>;
  dustLedgerEvents: Array<DustLedgerEvent>;
  hash: Scalars['HexEncoded']['output'];
  id: Scalars['Int']['output'];
  protocolVersion: Scalars['Int']['output'];
  raw: Scalars['HexEncoded']['output'];
  unshieldedCreatedOutputs: Array<UnshieldedUtxo>;
  unshieldedSpentOutputs: Array<UnshieldedUtxo>;
  zswapLedgerEvents: Array<ZswapLedgerEvent>;
};

/** Fees information for a transaction, including both paid and estimated fees. */
export type TransactionFees = {
  /** The estimated fees that was calculated for this transaction in DUST. */
  estimatedFees: Scalars['String']['output'];
  /** The actual fees paid for this transaction in DUST. */
  paidFees: Scalars['String']['output'];
};

/** Either a transaction hash or a transaction identifier. */
export type TransactionOffset =
  /** A hex-encoded transaction hash. */
  { hash: Scalars['HexEncoded']['input']; identifier?: never; }
  |  /** A hex-encoded transaction identifier. */
  { hash?: never; identifier: Scalars['HexEncoded']['input']; };

/**
 * The result of applying a transaction to the ledger state. In case of a partial success (status),
 * there will be segments.
 */
export type TransactionResult = {
  segments: Maybe<Array<Segment>>;
  status: TransactionResultStatus;
};

/** The status of the transaction result: success, partial success or failure. */
export type TransactionResultStatus =
  | 'FAILURE'
  | 'PARTIAL_SUCCESS'
  | 'SUCCESS'
  | '%future added value';

/** A transaction that created and/or spent UTXOs alongside these and other information. */
export type UnshieldedTransaction = {
  /** UTXOs created in the above transaction, possibly empty. */
  createdUtxos: Array<UnshieldedUtxo>;
  /** UTXOs spent in the above transaction, possibly empty. */
  spentUtxos: Array<UnshieldedUtxo>;
  /** The transaction that created and/or spent UTXOs. */
  transaction: Transaction;
};

/** An event of the unshielded transactions subscription. */
export type UnshieldedTransactionsEvent = UnshieldedTransaction | UnshieldedTransactionsProgress;

/** Information about the unshielded indexing progress. */
export type UnshieldedTransactionsProgress = {
  /** The highest transaction ID of all currently known transactions for a subscribed address. */
  highestTransactionId: Scalars['Int']['output'];
};

/** Represents an unshielded UTXO. */
export type UnshieldedUtxo = {
  /** Transaction that created this UTXO. */
  createdAtTransaction: Transaction;
  /** The creation time in seconds. */
  ctime: Maybe<Scalars['Int']['output']>;
  /** The hex-encoded initial nonce for DUST generation tracking. */
  initialNonce: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized intent hash. */
  intentHash: Scalars['HexEncoded']['output'];
  /** Index of this output within its creating transaction. */
  outputIndex: Scalars['Int']['output'];
  /** Owner Bech32m-encoded address. */
  owner: Scalars['UnshieldedAddress']['output'];
  /** Whether this UTXO is registered for DUST generation. */
  registeredForDustGeneration: Scalars['Boolean']['output'];
  /** Transaction that spent this UTXO. */
  spentAtTransaction: Maybe<Transaction>;
  /** Token hex-encoded serialized token type. */
  tokenType: Scalars['HexEncoded']['output'];
  /** UTXO value (quantity) as a string to support u128. */
  value: Scalars['String']['output'];
};

/** A zswap related ledger event. */
export type ZswapLedgerEvent = {
  /** The ID of this zswap ledger event. */
  id: Scalars['Int']['output'];
  /** The maximum ID of all zswap ledger events. */
  maxId: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  raw: Scalars['HexEncoded']['output'];
};

export type BlockHashQueryQueryVariables = Exact<{
  offset: InputMaybe<BlockOffset>;
}>;


export type BlockHashQueryQuery = { block: { height: number, hash: string } | null };

export type TxIdQueryQueryVariables = Exact<{
  offset: TransactionOffset;
}>;


export type TxIdQueryQuery = { transactions: Array<{ identifiers: Array<string>, id: number, protocolVersion: number, raw: string, hash: string, fees: { estimatedFees: string, paidFees: string }, transactionResult: { status: TransactionResultStatus, segments: Array<{ id: number, success: boolean }> | null }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, block: { height: number, hash: string, author: string | null, timestamp: number } } | { id: number, protocolVersion: number, raw: string, hash: string, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, block: { height: number, hash: string, author: string | null, timestamp: number } }> };

export type DeployTxQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type DeployTxQueryQuery = { contractAction: { deploy: { transaction: { identifiers: Array<string>, id: number, protocolVersion: number, raw: string, hash: string, fees: { estimatedFees: string, paidFees: string }, transactionResult: { status: TransactionResultStatus, segments: Array<{ id: number, success: boolean }> | null }, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } | { id: number, protocolVersion: number, raw: string, hash: string, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } } } | { transaction: { identifiers: Array<string>, id: number, protocolVersion: number, raw: string, hash: string, fees: { estimatedFees: string, paidFees: string }, transactionResult: { status: TransactionResultStatus, segments: Array<{ id: number, success: boolean }> | null }, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } | { id: number, protocolVersion: number, raw: string, hash: string, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } } | { transaction: { identifiers: Array<string>, id: number, protocolVersion: number, raw: string, hash: string, fees: { estimatedFees: string, paidFees: string }, transactionResult: { status: TransactionResultStatus, segments: Array<{ id: number, success: boolean }> | null }, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } | { id: number, protocolVersion: number, raw: string, hash: string, contractActions: Array<{ address: string } | { address: string } | { address: string }>, block: { height: number, hash: string, author: string | null, timestamp: number }, unshieldedCreatedOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }>, unshieldedSpentOutputs: Array<{ owner: string, intentHash: string, tokenType: string, value: string }> } } | null };

export type DeployContractStateTxQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type DeployContractStateTxQueryQuery = { contractAction: { deploy: { transaction: { contractActions: Array<{ address: string, state: string } | { address: string, state: string } | { address: string, state: string }> } | { contractActions: Array<{ address: string, state: string } | { address: string, state: string } | { address: string, state: string }> } } } | { state: string } | { state: string } | null };

export type LatestContractTxBlockHeightQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type LatestContractTxBlockHeightQueryQuery = { contractAction: { transaction: { block: { height: number } } | { block: { height: number } } } | { transaction: { block: { height: number } } | { block: { height: number } } } | { transaction: { block: { height: number } } | { block: { height: number } } } | null };

export type TxsFromBlockSubSubscriptionVariables = Exact<{
  offset: InputMaybe<BlockOffset>;
}>;


export type TxsFromBlockSubSubscription = { blocks: { hash: string, height: number, transactions: Array<{ identifiers: Array<string>, hash: string, contractActions: Array<{ state: string, address: string } | { state: string, address: string } | { state: string, address: string }> } | { hash: string, contractActions: Array<{ state: string, address: string } | { state: string, address: string } | { state: string, address: string }> }> } };

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

export type UnshieldedBalanceQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type UnshieldedBalanceQueryQuery = { contractAction: { deploy: { unshieldedBalances: Array<{ tokenType: string, amount: string }> } } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } | null };

export type QueryUnshieldedBalancesWithOffsetQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type QueryUnshieldedBalancesWithOffsetQuery = { contractAction: { deploy: { unshieldedBalances: Array<{ tokenType: string, amount: string }> } } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } | null };

export type UnshieldedBalanceSubSubscriptionVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
}>;


export type UnshieldedBalanceSubSubscription = { contractActions: { deploy: { unshieldedBalances: Array<{ tokenType: string, amount: string }> } } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } | { unshieldedBalances: Array<{ tokenType: string, amount: string }> } };


export const BlockHashQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BLOCK_HASH_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<BlockHashQueryQuery, BlockHashQueryQueryVariables>;
export const TxIdQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TX_ID_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionOffset"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxIdQueryQuery, TxIdQueryQueryVariables>;
export const DeployTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployTxQueryQuery, DeployTxQueryQueryVariables>;
export const DeployContractStateTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_CONTRACT_STATE_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployContractStateTxQueryQuery, DeployContractStateTxQueryQueryVariables>;
export const LatestContractTxBlockHeightQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]} as unknown as DocumentNode<LatestContractTxBlockHeightQueryQuery, LatestContractTxBlockHeightQueryQueryVariables>;
export const TxsFromBlockSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TXS_FROM_BLOCK_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"transactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxsFromBlockSubSubscription, TxsFromBlockSubSubscriptionVariables>;
export const ContractStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateQueryQuery, ContractStateQueryQueryVariables>;
export const ContractStateSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CONTRACT_STATE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateSubSubscription, ContractStateSubSubscriptionVariables>;
export const BothStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BOTH_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"chainState"}}]}}]}}]} as unknown as DocumentNode<BothStateQueryQuery, BothStateQueryQueryVariables>;
export const UnshieldedBalanceQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceQueryQuery, UnshieldedBalanceQueryQueryVariables>;
export const QueryUnshieldedBalancesWithOffsetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QUERY_UNSHIELDED_BALANCES_WITH_OFFSET"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<QueryUnshieldedBalancesWithOffsetQuery, QueryUnshieldedBalancesWithOffsetQueryVariables>;
export const UnshieldedBalanceSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceSubSubscription, UnshieldedBalanceSubSubscriptionVariables>;