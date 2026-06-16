/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
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
  CardanoRewardAddress: { input: string; output: string; }
  DustAddress: { input: string; output: string; }
  HexEncoded: { input: string; output: string; }
  Unit: { input: null; output: null; }
  UnshieldedAddress: { input: string; output: string; }
  ViewingKey: { input: string; output: string; }
};

/**
 * Tagged-union helper for fields like `Either<ZswapCoinPublicKey, ContractAddress>`
 * used in standard unshielded events.
 *
 * Exactly one of `userAddress` or `contractAddress` is non-null; the `kind`
 * discriminator says which.
 */
export type AddressOrContract = {
  /** Hex-encoded contract address; populated when kind = CONTRACT. */
  readonly contractAddress: Maybe<Scalars['HexEncoded']['output']>;
  readonly kind: AddressOrContractKind;
  /**
   * Bech32m-encoded user address; populated when kind = USER.
   * Hex-encoded here at the wire level; clients re-encode if needed.
   */
  readonly userAddress: Maybe<Scalars['HexEncoded']['output']>;
};

export type AddressOrContractKind =
  | 'CONTRACT'
  | 'USER'
  | '%future added value';

/** A block with its relevant data. */
export type Block = {
  /** The hex-encoded block author. */
  readonly author: Maybe<Scalars['HexEncoded']['output']>;
  /** The dust commitment tree end index at this block; exclusive, i.e. the next free index. */
  readonly dustCommitmentEndIndex: Scalars['Int']['output'];
  /** The hex-encoded dust commitment Merkle tree root at the latest indexed state. */
  readonly dustCommitmentMerkleTreeRoot: Maybe<Scalars['HexEncoded']['output']>;
  /** The dust generation tree end index at this block; exclusive, i.e. the next free index. */
  readonly dustGenerationEndIndex: Scalars['Int']['output'];
  /** The hex-encoded dust generation Merkle tree root at the latest indexed state. */
  readonly dustGenerationMerkleTreeRoot: Maybe<Scalars['HexEncoded']['output']>;
  /** The block hash. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The block height. */
  readonly height: Scalars['Int']['output'];
  /** The hex-encoded ledger parameters for this block. */
  readonly ledgerParameters: Scalars['HexEncoded']['output'];
  /** The parent of this block. */
  readonly parent: Maybe<Block>;
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The system parameters (governance) at this block height. */
  readonly systemParameters: SystemParameters;
  /** The UNIX timestamp. */
  readonly timestamp: Scalars['Int']['output'];
  /** The transactions within this block. */
  readonly transactions: ReadonlyArray<Transaction>;
  /** The zswap commitment tree end index at this block; exclusive, i.e. the next free index. */
  readonly zswapEndIndex: Scalars['Int']['output'];
  /** The hex-encoded serialized zswap state Merkle tree root. */
  readonly zswapMerkleTreeRoot: Scalars['HexEncoded']['output'];
};

/** Either a block hash or a block height. */
export type BlockOffset =
  /** A hex-encoded block hash. */
  { readonly hash: Scalars['HexEncoded']['input']; readonly height?: never; }
  |  /** A block height. */
  { readonly hash?: never; readonly height: Scalars['Int']['input']; };

/** A Merkle tree collapsed update between two indices. */
export type CollapsedMerkleTree = {
  /** The end index. */
  readonly endIndex: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The start index. */
  readonly startIndex: Scalars['Int']['output'];
  /** The hex-encoded value. */
  readonly update: Scalars['HexEncoded']['output'];
};

/** Committee member for an epoch. */
export type CommitteeMember = {
  readonly auraPubkeyHex: Maybe<Scalars['String']['output']>;
  readonly epochNo: Scalars['Int']['output'];
  readonly expectedSlots: Scalars['Int']['output'];
  readonly poolIdHex: Maybe<Scalars['String']['output']>;
  readonly position: Scalars['Int']['output'];
  readonly sidechainPubkeyHex: Scalars['String']['output'];
  readonly spoSkHex: Maybe<Scalars['String']['output']>;
};

/** Options for the connect mutation. */
export type ConnectOptions = {
  /** Transaction index to start searching for relevant transactions (inclusive). */
  readonly startIndex: InputMaybe<Scalars['Int']['input']>;
};

/** A contract action. */
export type ContractAction = {
  readonly address: Scalars['HexEncoded']['output'];
  readonly state: Scalars['HexEncoded']['output'];
  readonly transaction: Transaction;
  readonly unshieldedBalances: ReadonlyArray<ContractBalance>;
  readonly zswapState: Scalars['HexEncoded']['output'];
};

/** Either a block offset or a transaction offset. */
export type ContractActionOffset =
  /** Either a block hash or a block height. */
  { readonly blockOffset: BlockOffset; readonly transactionOffset?: never; }
  |  /** Either a transaction hash or a transaction identifier. */
  { readonly blockOffset?: never; readonly transactionOffset: TransactionOffset; };

/**
 * Represents a token balance held by a contract.
 * This type is exposed through the GraphQL API to allow clients to query
 * unshielded token balances for any contract action (Deploy, Call, Update).
 */
export type ContractBalance = {
  /** Balance amount as string to support larger integer values (up to 16 bytes). */
  readonly amount: Scalars['String']['output'];
  /** Hex-encoded token type identifier. */
  readonly tokenType: Scalars['HexEncoded']['output'];
};

/** A contract call. */
export type ContractCall = ContractAction & {
  /** The hex-encoded serialized address. */
  readonly address: Scalars['HexEncoded']['output'];
  /**
   * Contract events emitted by this contract call.
   *
   * Only `ContractCall` exposes this field — `ContractDeploy` and
   * `ContractUpdate` don't execute circuits with the `log()` expression.
   * Per Andrzej's 12 May design call (#feat-public-events).
   *
   * Events are attributed to a call by matching contract address and entry
   * point within the transaction; if several calls in one transaction share
   * both, their events are not attributed here and remain reachable via the
   * top-level `contractEvents` query.
   */
  readonly contractEvents: ReadonlyArray<ContractEvent>;
  /** Contract deploy for this contract call. */
  readonly deploy: ContractDeploy;
  /** The entry point. */
  readonly entryPoint: Scalars['String']['output'];
  /** The hex-encoded serialized state. */
  readonly state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract call. */
  readonly transaction: Transaction;
  /** Unshielded token balances held by this contract. */
  readonly unshieldedBalances: ReadonlyArray<ContractBalance>;
  /** The hex-encoded serialized contract-specific zswap state. */
  readonly zswapState: Scalars['HexEncoded']['output'];
};

/** A contract deployment. */
export type ContractDeploy = ContractAction & {
  /** The hex-encoded serialized address. */
  readonly address: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized state. */
  readonly state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract deploy. */
  readonly transaction: Transaction;
  /** Unshielded token balances held by this contract. */
  readonly unshieldedBalances: ReadonlyArray<ContractBalance>;
  /** The hex-encoded serialized contract-specific zswap state. */
  readonly zswapState: Scalars['HexEncoded']['output'];
};

/** Common interface implemented by every concrete contract event type. */
export type ContractEvent = {
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

/**
 * Filter for contract events queries and subscriptions. Block-range bounds
 * live here so the same shape works for both (per Andrzej 21 May review).
 */
export type ContractEventFilter = {
  /** Required: the contract address to filter events for. */
  readonly contractAddress: Scalars['HexEncoded']['input'];
  /** Optional: prefix-match on indexed fields of the event. Standard events only. */
  readonly fieldPrefixes: InputMaybe<ReadonlyArray<FieldPrefixFilter>>;
  /**
   * Optional: lower bound on the block height an event was emitted in. On
   * subscription, acts as a starting cursor (alternative to `id`).
   */
  readonly fromBlock: InputMaybe<Scalars['Int']['input']>;
  /**
   * Optional: upper bound on the block height an event was emitted in. On
   * subscription, terminates the stream once the chain reaches this block.
   */
  readonly toBlock: InputMaybe<Scalars['Int']['input']>;
  /**
   * Optional: hex-encoded transaction hash; narrows to events emitted from
   * transactions with this hash ("I just submitted tx X, give me its
   * events").
   */
  readonly transactionHash: InputMaybe<Scalars['HexEncoded']['input']>;
  /**
   * Optional: filter to a subset of contract event types. Indexer translates
   * to `variant = ANY(...)` against the indexed variant column.
   */
  readonly types: InputMaybe<ReadonlyArray<ContractEventType>>;
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

/** A contract update. */
export type ContractUpdate = ContractAction & {
  /** The hex-encoded serialized address. */
  readonly address: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized state. */
  readonly state: Scalars['HexEncoded']['output'];
  /** Transaction for this contract update. */
  readonly transaction: Transaction;
  /** Unshielded token balances held by this contract after the update. */
  readonly unshieldedBalances: ReadonlyArray<ContractBalance>;
  /** The hex-encoded serialized contract-specific zswap state. */
  readonly zswapState: Scalars['HexEncoded']['output'];
};

/** The D-parameter controlling validator committee composition. */
export type DParameter = {
  /** Number of permissioned candidates. */
  readonly numPermissionedCandidates: Scalars['Int']['output'];
  /** Number of registered candidates. */
  readonly numRegisteredCandidates: Scalars['Int']['output'];
};

/** D-parameter change record for history queries. */
export type DParameterChange = {
  /** The hex-encoded block hash where this parameter became effective. */
  readonly blockHash: Scalars['HexEncoded']['output'];
  /** The block height where this parameter became effective. */
  readonly blockHeight: Scalars['Int']['output'];
  /** Number of permissioned candidates. */
  readonly numPermissionedCandidates: Scalars['Int']['output'];
  /** Number of registered candidates. */
  readonly numRegisteredCandidates: Scalars['Int']['output'];
  /** The UNIX timestamp when this parameter became effective. */
  readonly timestamp: Scalars['Int']['output'];
};

export type DustGenerationDtimeUpdate = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  readonly raw: Scalars['HexEncoded']['output'];
};

/**
 * A dust generation dtime update emitted when the backing Night UTXO is
 * spent and the entry's decay time is set.
 */
export type DustGenerationDtimeUpdateItem = {
  /** Generation-tree index of the entry whose dtime changed. */
  readonly generationMtIndex: Scalars['Int']['output'];
  /** The decay time as observed in this ledger event. */
  readonly newDtime: Scalars['Int']['output'];
  /** Hex-encoded hash of the NIGHT UTXO that backs this dust output. */
  readonly nightUtxoHash: Scalars['HexEncoded']['output'];
  /** The hex-encoded owner (dust address). */
  readonly owner: Scalars['HexEncoded']['output'];
  /** The hex-encoded originating transaction hash (32-byte chain identifier). */
  readonly transactionHash: Scalars['HexEncoded']['output'];
  /** The originating transaction ID (indexer-internal BIGSERIAL). */
  readonly transactionId: Scalars['Int']['output'];
  /**
   * Hex-encoded tagged-serialised `TreeInsertionPath<DustGenerationInfo>`
   * from the originating ledger event. Wallets deserialise this and hand
   * it to `generating_tree.update_from_evidence(...)`.
   */
  readonly treeInsertionPath: Scalars['HexEncoded']['output'];
};

/** DUST generation status for a specific Cardano reward address. */
export type DustGenerationStatus = {
  /** The Bech32-encoded Cardano reward address (e.g., stake_test1... or stake1...). */
  readonly cardanoRewardAddress: Scalars['CardanoRewardAddress']['output'];
  /** Current generated DUST capacity in SPECK. */
  readonly currentCapacity: Scalars['String']['output'];
  /** The Bech32m-encoded associated DUST address if registered. */
  readonly dustAddress: Maybe<Scalars['DustAddress']['output']>;
  /** DUST generation rate in SPECK per second. */
  readonly generationRate: Scalars['String']['output'];
  /** Maximum DUST capacity in SPECK. */
  readonly maxCapacity: Scalars['String']['output'];
  /** NIGHT balance backing generation in STAR. */
  readonly nightBalance: Scalars['String']['output'];
  /** Whether this reward address is registered. */
  readonly registered: Scalars['Boolean']['output'];
  /** Cardano UTXO output index for update/unregister operations. */
  readonly utxoOutputIndex: Maybe<Scalars['Int']['output']>;
  /** Cardano UTXO transaction hash for update/unregister operations. */
  readonly utxoTxHash: Maybe<Scalars['HexEncoded']['output']>;
};

/** Dust generations for a Cardano reward address. */
export type DustGenerations = {
  /** The Bech32-encoded Cardano reward address. */
  readonly cardanoRewardAddress: Scalars['CardanoRewardAddress']['output'];
  /** All active registrations with aggregated generation stats. */
  readonly registrations: ReadonlyArray<DustRegistration>;
};

/** An event of the dust generations subscription. */
export type DustGenerationsEvent = DustGenerationDtimeUpdateItem | DustGenerationsItem | DustGenerationsProgress;

/** A dust generations item with optional collapsed Merkle tree update. */
export type DustGenerationsItem = {
  /** Hex-encoded hash of the NIGHT UTXO that backs this dust output. */
  readonly backingNight: Scalars['HexEncoded']['output'];
  /** Collapsed Merkle tree update filling the gap before this entry. */
  readonly collapsedMerkleTree: Maybe<MerkleTreeCollapsedUpdate>;
  /** Index of this output in the dust commitment Merkle tree. */
  readonly commitmentMtIndex: Scalars['Int']['output'];
  /** The creation timestamp. */
  readonly ctime: Scalars['Int']['output'];
  /** Index of this output in the dust generation Merkle tree. */
  readonly generationMtIndex: Scalars['Int']['output'];
  /** The DUST value at creation, in SPECK. */
  readonly initialValue: Scalars['String']['output'];
  /** The hex-encoded owner (dust address). */
  readonly owner: Scalars['HexEncoded']['output'];
  /** The hex-encoded originating transaction hash (32-byte chain identifier). */
  readonly transactionHash: Scalars['HexEncoded']['output'];
  /** The originating transaction ID (indexer-internal BIGSERIAL). */
  readonly transactionId: Scalars['Int']['output'];
  /** The NIGHT value backing this output, in STAR. */
  readonly value: Scalars['String']['output'];
};

/** Progress indicator for dust generations subscription (includes final collapsed update). */
export type DustGenerationsProgress = {
  /** Final collapsed Merkle tree update covering remaining range. */
  readonly collapsedMerkleTree: Maybe<MerkleTreeCollapsedUpdate>;
  /** The highest index processed so far. */
  readonly highestIndex: Scalars['Int']['output'];
};

export type DustInitialUtxo = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  readonly maxId: Scalars['Int']['output'];
  /** The dust output. */
  readonly output: DustOutput;
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  readonly raw: Scalars['HexEncoded']['output'];
};

/** A dust related ledger event. */
export type DustLedgerEvent = {
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
};

/** A transaction containing a dust nullifier match with block context. */
export type DustNullifierTransaction = {
  /** The hex-encoded block hash (use to query block with ledger parameters). */
  readonly blockHash: Scalars['HexEncoded']['output'];
  /** The block height containing this transaction. */
  readonly blockHeight: Scalars['Int']['output'];
  /** The hex-encoded commitment, in 32-byte little-endian form. */
  readonly commitmentLeBytes: Scalars['HexEncoded']['output'];
  /** The hex-encoded matched nullifier, in 32-byte little-endian form. */
  readonly nullifierLeBytes: Scalars['HexEncoded']['output'];
  /** The transaction containing this nullifier match. */
  readonly transaction: Transaction;
  /** The hex-encoded transaction hash (32-byte chain identifier). */
  readonly transactionHash: Scalars['HexEncoded']['output'];
  /** The transaction ID (indexer-internal BIGSERIAL, use as resumption cursor). */
  readonly transactionId: Scalars['Int']['output'];
};

/** A dust output. */
export type DustOutput = {
  /** The hex-encoded 32-byte nonce. */
  readonly nonce: Scalars['HexEncoded']['output'];
};

/** A single dust registration with aggregated generation stats. */
export type DustRegistration = {
  /** Current generated DUST capacity in SPECK. */
  readonly currentCapacity: Scalars['String']['output'];
  /** The Bech32m-encoded DUST address. */
  readonly dustAddress: Scalars['DustAddress']['output'];
  /** DUST generation rate in SPECK per second. */
  readonly generationRate: Scalars['String']['output'];
  /** Maximum DUST capacity in SPECK. */
  readonly maxCapacity: Scalars['String']['output'];
  /** NIGHT balance backing generation in STAR. */
  readonly nightBalance: Scalars['String']['output'];
  /** Cardano UTXO output index. */
  readonly utxoOutputIndex: Maybe<Scalars['Int']['output']>;
  /** Cardano UTXO transaction hash. */
  readonly utxoTxHash: Maybe<Scalars['HexEncoded']['output']>;
  /** Whether this registration is valid. */
  readonly valid: Scalars['Boolean']['output'];
};

export type DustSpendProcessed = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  readonly raw: Scalars['HexEncoded']['output'];
};

/** Current epoch information. */
export type EpochInfo = {
  readonly durationSeconds: Scalars['Int']['output'];
  readonly elapsedSeconds: Scalars['Int']['output'];
  readonly epochNo: Scalars['Int']['output'];
};

/** SPO performance for an epoch. */
export type EpochPerf = {
  readonly epochNo: Scalars['Int']['output'];
  readonly expected: Scalars['Int']['output'];
  readonly identityLabel: Maybe<Scalars['String']['output']>;
  readonly poolIdHex: Maybe<Scalars['String']['output']>;
  readonly produced: Scalars['Int']['output'];
  readonly spoSkHex: Scalars['String']['output'];
  readonly stakeSnapshot: Maybe<Scalars['String']['output']>;
  readonly validatorClass: Maybe<Scalars['String']['output']>;
};

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
  readonly fieldName: Scalars['String']['input'];
  /**
   * Hex-encoded prefix bytes. Empty string matches all values; otherwise
   * the indexer returns events whose field value starts with this prefix,
   * client filters to exact match if needed.
   */
  readonly prefix: Scalars['HexEncoded']['input'];
};

/** First valid epoch for an SPO identity. */
export type FirstValidEpoch = {
  readonly firstValidEpoch: Scalars['Int']['output'];
  readonly idKey: Scalars['String']['output'];
};

/** A Merkle tree collapsed update between two indices. */
export type MerkleTreeCollapsedUpdate = {
  /** The end index. */
  readonly endIndex: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The start index. */
  readonly startIndex: Scalars['Int']['output'];
  /** The hex-encoded value. */
  readonly update: Scalars['HexEncoded']['output'];
};

export type MiscContractEvent = ContractEvent & {
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  /** Hex-encoded contract-defined event name (Compact Bytes<32>). */
  readonly name: Scalars['HexEncoded']['output'];
  /**
   * Hex-encoded opaque payload (Compact Bytes<256>); consumer brings
   * descriptor to decode.
   */
  readonly payload: Scalars['HexEncoded']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type Mutation = {
  /** Connect the wallet with the given viewing key and return a session ID. */
  readonly connect: Scalars['HexEncoded']['output'];
  /** Disconnect the wallet with the given session ID. */
  readonly disconnect: Scalars['Unit']['output'];
};


export type MutationConnectArgs = {
  options: InputMaybe<ConnectOptions>;
  viewingKey: Scalars['ViewingKey']['input'];
};


export type MutationDisconnectArgs = {
  sessionId: Scalars['HexEncoded']['input'];
};

export type ParamChange = DustLedgerEvent & {
  /** The ID of this dust ledger event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all dust ledger events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  readonly raw: Scalars['HexEncoded']['output'];
};

export type PausedEvent = ContractEvent & {
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

/** Pool metadata from Cardano. */
export type PoolMetadata = {
  readonly hexId: Maybe<Scalars['String']['output']>;
  readonly homepageUrl: Maybe<Scalars['String']['output']>;
  readonly logoUrl: Maybe<Scalars['String']['output']>;
  readonly name: Maybe<Scalars['String']['output']>;
  readonly poolIdHex: Scalars['String']['output'];
  readonly ticker: Maybe<Scalars['String']['output']>;
};

/** Presence event for an SPO in an epoch. */
export type PresenceEvent = {
  readonly epochNo: Scalars['Int']['output'];
  readonly idKey: Scalars['String']['output'];
  readonly source: Scalars['String']['output'];
  readonly status: Maybe<Scalars['String']['output']>;
};

export type Query = {
  /** Find a block for the given optional offset; if not present, the latest block is returned. */
  readonly block: Maybe<Block>;
  /** Get committee membership for an epoch. */
  readonly committee: ReadonlyArray<CommitteeMember>;
  /** Find a contract action for the given address and optional offset. */
  readonly contractAction: Maybe<ContractAction>;
  /**
   * Find contract events matching the filter, with optional pagination.
   *
   * Block-range bounds (`fromBlock`, `toBlock`) live on `ContractEventFilter`
   * for symmetry with the subscription. `limit`/`offset` are top-level args.
   */
  readonly contractEvents: ReadonlyArray<ContractEvent>;
  /** Get current epoch information. */
  readonly currentEpochInfo: Maybe<EpochInfo>;
  /** Get the full history of D-parameter changes for governance auditability. */
  readonly dParameterHistory: ReadonlyArray<DParameterChange>;
  /** Get a collapsed Merkle tree update for the dust commitment tree. */
  readonly dustCommitmentMerkleTreeUpdate: MerkleTreeCollapsedUpdate;
  /** Get a collapsed Merkle tree update for the dust generation tree. */
  readonly dustGenerationMerkleTreeUpdate: MerkleTreeCollapsedUpdate;
  /** Get DUST generation status for specific Cardano reward addresses. */
  readonly dustGenerationStatus: ReadonlyArray<DustGenerationStatus>;
  /**
   * Get all active DUST registrations and aggregated generation stats for Cardano reward
   * addresses.
   */
  readonly dustGenerations: ReadonlyArray<DustGenerations>;
  /** Get epoch performance for all SPOs. */
  readonly epochPerformance: ReadonlyArray<EpochPerf>;
  /** Get epoch utilization (produced/expected ratio). */
  readonly epochUtilization: Maybe<Scalars['Float']['output']>;
  /** Get pool metadata by pool ID. */
  readonly poolMetadata: Maybe<PoolMetadata>;
  /** List pool metadata with pagination. */
  readonly poolMetadataList: ReadonlyArray<PoolMetadata>;
  /** Get first valid epoch for each SPO identity. */
  readonly registeredFirstValidEpochs: ReadonlyArray<FirstValidEpoch>;
  /** Get raw presence events for an epoch range. */
  readonly registeredPresence: ReadonlyArray<PresenceEvent>;
  /** Get registration statistics for an epoch range. */
  readonly registeredSpoSeries: ReadonlyArray<RegisteredStat>;
  /** Get cumulative registration totals for an epoch range. */
  readonly registeredTotalsSeries: ReadonlyArray<RegisteredTotals>;
  /** Get SPO with metadata by pool ID. */
  readonly spoByPoolId: Maybe<Spo>;
  /** Get composite SPO data (identity + metadata + performance). */
  readonly spoCompositeByPoolId: Maybe<SpoComposite>;
  /** Get total count of SPOs. */
  readonly spoCount: Maybe<Scalars['Int']['output']>;
  /** List SPO identities with pagination. */
  readonly spoIdentities: ReadonlyArray<SpoIdentity>;
  /** Get SPO identity by pool ID. */
  readonly spoIdentityByPoolId: Maybe<SpoIdentity>;
  /** List SPOs with optional search. */
  readonly spoList: ReadonlyArray<Spo>;
  /** Get SPO performance by SPO key. */
  readonly spoPerformanceBySpoSk: ReadonlyArray<EpochPerf>;
  /** Get latest SPO performance entries. */
  readonly spoPerformanceLatest: ReadonlyArray<EpochPerf>;
  /** Get stake distribution with search and ordering. */
  readonly stakeDistribution: ReadonlyArray<StakeShare>;
  /** Get SPO identifiers ordered by performance. */
  readonly stakePoolOperators: ReadonlyArray<Scalars['String']['output']>;
  /** Get the full history of Terms and Conditions changes for governance auditability. */
  readonly termsAndConditionsHistory: ReadonlyArray<TermsAndConditionsChange>;
  /** Find transactions for the given offset. */
  readonly transactions: ReadonlyArray<Transaction>;
  /** Get a Merkle tree collapsed update for the given zswap state index range. */
  readonly zswapMerkleTreeCollapsedUpdate: MerkleTreeCollapsedUpdate;
};


export type QueryBlockArgs = {
  offset: InputMaybe<BlockOffset>;
};


export type QueryCommitteeArgs = {
  epoch: Scalars['Int']['input'];
};


export type QueryContractActionArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
};


export type QueryContractEventsArgs = {
  filter: ContractEventFilter;
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDustCommitmentMerkleTreeUpdateArgs = {
  endIndex: Scalars['Int']['input'];
  startIndex: Scalars['Int']['input'];
};


export type QueryDustGenerationMerkleTreeUpdateArgs = {
  endIndex: Scalars['Int']['input'];
  startIndex: Scalars['Int']['input'];
};


export type QueryDustGenerationStatusArgs = {
  cardanoRewardAddresses: ReadonlyArray<Scalars['CardanoRewardAddress']['input']>;
};


export type QueryDustGenerationsArgs = {
  cardanoRewardAddresses: ReadonlyArray<Scalars['CardanoRewardAddress']['input']>;
};


export type QueryEpochPerformanceArgs = {
  epoch: Scalars['Int']['input'];
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEpochUtilizationArgs = {
  epoch: Scalars['Int']['input'];
};


export type QueryPoolMetadataArgs = {
  poolIdHex: Scalars['String']['input'];
};


export type QueryPoolMetadataListArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  withNameOnly: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryRegisteredFirstValidEpochsArgs = {
  uptoEpoch: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRegisteredPresenceArgs = {
  fromEpoch: Scalars['Int']['input'];
  toEpoch: Scalars['Int']['input'];
};


export type QueryRegisteredSpoSeriesArgs = {
  fromEpoch: Scalars['Int']['input'];
  toEpoch: Scalars['Int']['input'];
};


export type QueryRegisteredTotalsSeriesArgs = {
  fromEpoch: Scalars['Int']['input'];
  toEpoch: Scalars['Int']['input'];
};


export type QuerySpoByPoolIdArgs = {
  poolIdHex: Scalars['String']['input'];
};


export type QuerySpoCompositeByPoolIdArgs = {
  poolIdHex: Scalars['String']['input'];
};


export type QuerySpoIdentitiesArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpoIdentityByPoolIdArgs = {
  poolIdHex: Scalars['String']['input'];
};


export type QuerySpoListArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  search: InputMaybe<Scalars['String']['input']>;
};


export type QuerySpoPerformanceBySpoSkArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  spoSkHex: Scalars['String']['input'];
};


export type QuerySpoPerformanceLatestArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStakeDistributionArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  orderByStakeDesc: InputMaybe<Scalars['Boolean']['input']>;
  search: InputMaybe<Scalars['String']['input']>;
};


export type QueryStakePoolOperatorsArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTransactionsArgs = {
  offset: TransactionOffset;
};


export type QueryZswapMerkleTreeCollapsedUpdateArgs = {
  endIndex: Scalars['Int']['input'];
  startIndex: Scalars['Int']['input'];
};

/** Registration statistics for an epoch. */
export type RegisteredStat = {
  readonly dparam: Maybe<Scalars['Float']['output']>;
  readonly epochNo: Scalars['Int']['output'];
  readonly federatedInvalidCount: Scalars['Int']['output'];
  readonly federatedValidCount: Scalars['Int']['output'];
  readonly registeredInvalidCount: Scalars['Int']['output'];
  readonly registeredValidCount: Scalars['Int']['output'];
};

/** Cumulative registration totals for an epoch. */
export type RegisteredTotals = {
  readonly epochNo: Scalars['Int']['output'];
  readonly newlyRegistered: Scalars['Int']['output'];
  readonly totalRegistered: Scalars['Int']['output'];
};

/** A regular Midnight transaction. */
export type RegularTransaction = Transaction & {
  /** The block for this transaction. */
  readonly block: Block;
  /** The contract actions for this transaction. */
  readonly contractActions: ReadonlyArray<ContractAction>;
  /** The dust commitment tree end index. */
  readonly dustCommitmentEndIndex: Scalars['Int']['output'];
  /** The dust commitment tree start index. */
  readonly dustCommitmentStartIndex: Scalars['Int']['output'];
  /** The dust generation tree end index. */
  readonly dustGenerationEndIndex: Scalars['Int']['output'];
  /** The dust generation tree start index. */
  readonly dustGenerationStartIndex: Scalars['Int']['output'];
  /** Dust ledger events of this transaction. */
  readonly dustLedgerEvents: ReadonlyArray<DustLedgerEvent>;
  /**
   * The end index into the zswap state; exclusive, i.e. the next free index.
   * @deprecated Use zswapEndIndex instead
   */
  readonly endIndex: Scalars['Int']['output'];
  /** The fee for this transaction in SPECK (atomic unit of DUST). */
  readonly fee: Scalars['String']['output'];
  /**
   * Fee information for this transaction.
   * @deprecated Use fee instead
   */
  readonly fees: TransactionFees;
  /** The hex-encoded transaction hash. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The transaction ID. */
  readonly id: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction identifiers. */
  readonly identifiers: ReadonlyArray<Scalars['HexEncoded']['output']>;
  /**
   * The hex-encoded serialized zswap state Merkle tree root.
   * @deprecated Use zswapMerkleTreeRoot instead
   */
  readonly merkleTreeRoot: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction content. */
  readonly raw: Scalars['HexEncoded']['output'];
  /**
   * The start index into the zswap state.
   * @deprecated Use zswapStartIndex instead
   */
  readonly startIndex: Scalars['Int']['output'];
  /** The result of applying this transaction to the ledger state. */
  readonly transactionResult: TransactionResult;
  /** Unshielded UTXOs created by this transaction. */
  readonly unshieldedCreatedOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** Unshielded UTXOs spent (consumed) by this transaction. */
  readonly unshieldedSpentOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** The end index into the zswap state; exclusive, i.e. the next free index. */
  readonly zswapEndIndex: Scalars['Int']['output'];
  /** Zswap ledger events of this transaction. */
  readonly zswapLedgerEvents: ReadonlyArray<ZswapLedgerEvent>;
  /** The hex-encoded serialized zswap state Merkle tree root. */
  readonly zswapMerkleTreeRoot: Scalars['HexEncoded']['output'];
  /** The start index into the zswap state. */
  readonly zswapStartIndex: Scalars['Int']['output'];
};

/**
 * A transaction relevant for the subscribing wallet and an optional zswap state Merkle tree
 * collapsed update.
 */
export type RelevantTransaction = {
  /**
   * An optional collapsed Merkle tree.
   * @deprecated Use zswapCollapsedUpdate instead
   */
  readonly collapsedMerkleTree: Maybe<CollapsedMerkleTree>;
  /** A transaction relevant for the subscribing wallet. */
  readonly transaction: RegularTransaction;
  /**
   * Only include a zswap state Merkle tree collapsed update if there is a gap between the
   * current zswap index "driving" the subscription and the zswap start index of the
   * transaction.
   */
  readonly zswapCollapsedUpdate: Maybe<MerkleTreeCollapsedUpdate>;
};

/**
 * One of many segments for a partially successful transaction result showing success for some
 * segment.
 */
export type Segment = {
  /** Segment ID. */
  readonly id: Scalars['Int']['output'];
  /** Successful or not. */
  readonly success: Scalars['Boolean']['output'];
};

export type ShieldedBurnEvent = ContractEvent & {
  /** Optional, hidden in some shielded burns (`Maybe<Uint<128>>`). */
  readonly amount: Maybe<Scalars['String']['output']>;
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  /** Indexed. */
  readonly nullifier: Scalars['HexEncoded']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type ShieldedMintEvent = ContractEvent & {
  /** Optional, hidden in some shielded mints (`Maybe<Uint<128>>`). */
  readonly amount: Maybe<Scalars['String']['output']>;
  /** Indexed. */
  readonly commitment: Scalars['HexEncoded']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** Indexed (per Andrzej, useful for token-type queries). */
  readonly domainSep: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

/** A transaction containing a shielded (zswap) nullifier match with block context. */
export type ShieldedNullifierTransaction = {
  /** The hex-encoded block hash (use to query block with ledger parameters). */
  readonly blockHash: Scalars['HexEncoded']['output'];
  /** The block height containing this transaction. */
  readonly blockHeight: Scalars['Int']['output'];
  /** The hex-encoded matched nullifier. */
  readonly nullifier: Scalars['HexEncoded']['output'];
  /** The transaction containing this nullifier match. */
  readonly transaction: Transaction;
  /** The hex-encoded transaction hash (32-byte chain identifier). */
  readonly transactionHash: Scalars['HexEncoded']['output'];
  /** The transaction ID (indexer-internal BIGSERIAL, use as resumption cursor). */
  readonly transactionId: Scalars['Int']['output'];
};

export type ShieldedReceiveEvent = ContractEvent & {
  /**
   * Indexed. Optional ciphertext for shielded coin receipt
   * (`Maybe<Bytes<512>>`). Hex-encoded, up to 512 bytes.
   */
  readonly ciphertext: Maybe<Scalars['HexEncoded']['output']>;
  /** Indexed. */
  readonly commitment: Scalars['HexEncoded']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /**
   * Set when received by a contract; null for user recipients
   * (`Maybe<ContractAddress>`). Renamed from `contractAddress` in the CoIP
   * to avoid collision with the top-level emitting `contractAddress`
   * inherited from the ContractEvent interface.
   */
  readonly receivingContractAddress: Maybe<Scalars['HexEncoded']['output']>;
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type ShieldedSpendEvent = ContractEvent & {
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  /** Indexed. */
  readonly nullifier: Scalars['HexEncoded']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

/** An event of the shielded transactions subscription. */
export type ShieldedTransactionsEvent = RelevantTransaction | ShieldedTransactionsProgress;

/** Information about the shielded transactions indexing progress. */
export type ShieldedTransactionsProgress = {
  /**
   * The highest highest end index into the zswap state for all transactions checked for
   * relevance. Initially less than and eventually (when some wallet has been fully indexed)
   * equal to `highest_end_index`. A value of zero (very unlikely) means that no wallet
   * has subscribed before and indexing for the subscribing wallet has not yet started.
   * @deprecated Use highestCheckedZswapEndIndex instead
   */
  readonly highestCheckedEndIndex: Scalars['Int']['output'];
  /**
   * The highest highest end index into the zswap state for all transactions checked for
   * relevance. Initially less than and eventually (when some wallet has been fully indexed)
   * equal to `highest_end_index`. A value of zero (very unlikely) means that no wallet
   * has subscribed before and indexing for the subscribing wallet has not yet started.
   */
  readonly highestCheckedZswapEndIndex: Scalars['Int']['output'];
  /**
   * The highest end index into the zswap state for all transactions. It represents the known
   * state of the blockchain. A value of zero (completely unlikely) means that no shielded
   * transactions have been indexed yet.
   * @deprecated Use highestZswapEndIndex instead
   */
  readonly highestEndIndex: Scalars['Int']['output'];
  /**
   * The highest highest end index into the zswap state for all relevant transactions for the
   * subscribing wallet. Usually less than `highest_checked_end_index` unless the latest
   * checked transaction is relevant for the subscribing wallet. A value of zero means that
   * no relevant transactions have been indexed for the subscribing wallet.
   * @deprecated Use highestRelevantZswapEndIndex instead
   */
  readonly highestRelevantEndIndex: Scalars['Int']['output'];
  /**
   * The highest highest end index into the zswap state for all relevant transactions for the
   * subscribing wallet. Usually less than `highest_checked_end_index` unless the latest
   * checked transaction is relevant for the subscribing wallet. A value of zero means that
   * no relevant transactions have been indexed for the subscribing wallet.
   */
  readonly highestRelevantZswapEndIndex: Scalars['Int']['output'];
  /**
   * The highest end index into the zswap state for all transactions. It represents the known
   * state of the blockchain. A value of zero (completely unlikely) means that no shielded
   * transactions have been indexed yet.
   */
  readonly highestZswapEndIndex: Scalars['Int']['output'];
};

/** SPO with optional metadata. */
export type Spo = {
  readonly auraPubkeyHex: Maybe<Scalars['String']['output']>;
  readonly homepageUrl: Maybe<Scalars['String']['output']>;
  readonly logoUrl: Maybe<Scalars['String']['output']>;
  readonly name: Maybe<Scalars['String']['output']>;
  readonly poolIdHex: Scalars['String']['output'];
  readonly sidechainPubkeyHex: Scalars['String']['output'];
  readonly ticker: Maybe<Scalars['String']['output']>;
  readonly validatorClass: Scalars['String']['output'];
};

/** Composite SPO data (identity + metadata + performance). */
export type SpoComposite = {
  readonly identity: Maybe<SpoIdentity>;
  readonly metadata: Maybe<PoolMetadata>;
  readonly performance: ReadonlyArray<EpochPerf>;
};

/** SPO identity information. */
export type SpoIdentity = {
  readonly auraPubkeyHex: Maybe<Scalars['String']['output']>;
  readonly mainchainPubkeyHex: Scalars['String']['output'];
  readonly poolIdHex: Scalars['String']['output'];
  readonly sidechainPubkeyHex: Scalars['String']['output'];
  readonly validatorClass: Scalars['String']['output'];
};

/**
 * Stake share information for an SPO.
 *
 * Values are sourced from mainchain pool data (e.g., Blockfrost) and keyed by Cardano pool_id.
 */
export type StakeShare = {
  /** Current active stake in lovelace. */
  readonly activeStake: Maybe<Scalars['String']['output']>;
  /** Declared pledge in lovelace. */
  readonly declaredPledge: Maybe<Scalars['String']['output']>;
  /** Pool homepage URL from metadata. */
  readonly homepageUrl: Maybe<Scalars['String']['output']>;
  /** Number of live delegators. */
  readonly liveDelegators: Maybe<Scalars['Int']['output']>;
  /** Current live pledge in lovelace. */
  readonly livePledge: Maybe<Scalars['String']['output']>;
  /** Saturation ratio (0.0 to 1.0+). */
  readonly liveSaturation: Maybe<Scalars['Float']['output']>;
  /** Current live stake in lovelace. */
  readonly liveStake: Maybe<Scalars['String']['output']>;
  /** Pool logo URL from metadata. */
  readonly logoUrl: Maybe<Scalars['String']['output']>;
  /** Pool name from metadata. */
  readonly name: Maybe<Scalars['String']['output']>;
  /** Cardano pool ID (56-character hex string). */
  readonly poolIdHex: Scalars['String']['output'];
  /** Stake share as a fraction of total stake. */
  readonly stakeShare: Maybe<Scalars['Float']['output']>;
  /** Pool ticker from metadata. */
  readonly ticker: Maybe<Scalars['String']['output']>;
};

export type Subscription = {
  /**
   * Subscribe to blocks starting at the given offset or at the latest block if the offset is
   * omitted.
   */
  readonly blocks: Block;
  /**
   * Subscribe to contract actions with the given address starting at the given offset or at the
   * latest block if the offset is omitted.
   */
  readonly contractActions: ContractAction;
  /**
   * Subscribe to contract events matching the given filter, returning
   * events in monotonic `id` order.
   */
  readonly contractEvents: ContractEvent;
  /**
   * Subscribe to dust generation entries for a dust address in `[start_index, end_index]`
   * inclusive. `dustGenerationEndIndex` is exclusive, pass `dustGenerationEndIndex - 1`.
   * Entries interleaved with collapsed Merkle tree updates and owned-entry dtime updates.
   */
  readonly dustGenerations: DustGenerationsEvent;
  /** Subscribe to dust ledger events starting at the given ID or at the very start if omitted. */
  readonly dustLedgerEvents: DustLedgerEvent;
  /**
   * Subscribe to transactions containing dust nullifiers whose 32-byte little-endian form
   * starts with one of the provided prefixes. Returns transaction and block references for
   * the wallet to fetch full data. If `toBlock` is specified, the subscription finishes
   * after reaching that block.
   */
  readonly dustNullifierTransactions: DustNullifierTransaction;
  /**
   * Subscribe to transactions containing shielded (zswap) nullifiers matching the provided
   * prefixes. Returns transaction and block references for wallet to fetch full data.
   * If `toBlock` is specified, the subscription finishes after reaching that block.
   */
  readonly shieldedNullifierTransactions: ShieldedNullifierTransaction;
  /**
   * Subscribe to shielded transaction events for the given session ID starting at the given
   * index or at zero if omitted.
   */
  readonly shieldedTransactions: ShieldedTransactionsEvent;
  /**
   * Subscribe unshielded transaction events for the given address and the given transaction ID
   * or zero if omitted.
   */
  readonly unshieldedTransactions: UnshieldedTransactionsEvent;
  /** Subscribe to zswap ledger events starting at the given ID or at the very start if omitted. */
  readonly zswapLedgerEvents: ZswapLedgerEvent;
};


export type SubscriptionBlocksArgs = {
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionContractActionsArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
};


export type SubscriptionContractEventsArgs = {
  filter: ContractEventFilter;
  id: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionDustGenerationsArgs = {
  dustAddress: Scalars['DustAddress']['input'];
  endIndex: Scalars['Int']['input'];
  startIndex: Scalars['Int']['input'];
};


export type SubscriptionDustLedgerEventsArgs = {
  id: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionDustNullifierTransactionsArgs = {
  fromBlock: InputMaybe<Scalars['Int']['input']>;
  nullifierLeBytesPrefixes: ReadonlyArray<Scalars['HexEncoded']['input']>;
  toBlock: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionShieldedNullifierTransactionsArgs = {
  fromBlock: InputMaybe<Scalars['Int']['input']>;
  nullifierPrefixes: ReadonlyArray<Scalars['HexEncoded']['input']>;
  toBlock: InputMaybe<Scalars['Int']['input']>;
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

/** System parameters at a specific block height. */
export type SystemParameters = {
  /** The D-parameter controlling validator committee composition. */
  readonly dParameter: DParameter;
  /** The current Terms and Conditions, if any have been set. */
  readonly termsAndConditions: Maybe<TermsAndConditions>;
};

/** A system Midnight transaction. */
export type SystemTransaction = Transaction & {
  /** The block for this transaction. */
  readonly block: Block;
  /** The contract actions for this transaction. */
  readonly contractActions: ReadonlyArray<ContractAction>;
  /** Dust ledger events of this transaction. */
  readonly dustLedgerEvents: ReadonlyArray<DustLedgerEvent>;
  /** The hex-encoded transaction hash. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The transaction ID. */
  readonly id: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized transaction content. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** Unshielded UTXOs created by this transaction. */
  readonly unshieldedCreatedOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** Unshielded UTXOs spent (consumed) by this transaction. */
  readonly unshieldedSpentOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** Zswap ledger events of this transaction. */
  readonly zswapLedgerEvents: ReadonlyArray<ZswapLedgerEvent>;
};

/** Terms and Conditions agreement. */
export type TermsAndConditions = {
  /** The hex-encoded hash of the Terms and Conditions document. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The URL where the Terms and Conditions can be found. */
  readonly url: Scalars['String']['output'];
};

/** Terms and Conditions change record for history queries. */
export type TermsAndConditionsChange = {
  /** The hex-encoded block hash where this T&C version became effective. */
  readonly blockHash: Scalars['HexEncoded']['output'];
  /** The block height where this T&C version became effective. */
  readonly blockHeight: Scalars['Int']['output'];
  /** The hex-encoded hash of the Terms and Conditions document. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The UNIX timestamp when this T&C version became effective. */
  readonly timestamp: Scalars['Int']['output'];
  /** The URL where the Terms and Conditions can be found. */
  readonly url: Scalars['String']['output'];
};

/** A Midnight transaction. */
export type Transaction = {
  readonly block: Block;
  readonly contractActions: ReadonlyArray<ContractAction>;
  readonly dustLedgerEvents: ReadonlyArray<DustLedgerEvent>;
  readonly hash: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  readonly unshieldedCreatedOutputs: ReadonlyArray<UnshieldedUtxo>;
  readonly unshieldedSpentOutputs: ReadonlyArray<UnshieldedUtxo>;
  readonly zswapLedgerEvents: ReadonlyArray<ZswapLedgerEvent>;
};

/** Fees information for a transaction. */
export type TransactionFees = {
  /**
   * The fees for this transaction in SPECK (atomic unit of DUST).
   * @deprecated Use paidFees instead
   */
  readonly estimatedFees: Scalars['String']['output'];
  /** The fees for this transaction in SPECK (atomic unit of DUST). */
  readonly paidFees: Scalars['String']['output'];
};

/** Either a transaction hash or a transaction identifier. */
export type TransactionOffset =
  /** A hex-encoded transaction hash. */
  { readonly hash: Scalars['HexEncoded']['input']; readonly identifier?: never; }
  |  /** A hex-encoded transaction identifier. */
  { readonly hash?: never; readonly identifier: Scalars['HexEncoded']['input']; };

/**
 * The result of applying a transaction to the ledger state. In case of a partial success (status),
 * there will be segments.
 */
export type TransactionResult = {
  readonly segments: Maybe<ReadonlyArray<Segment>>;
  readonly status: TransactionResultStatus;
};

/** The status of the transaction result: success, partial success or failure. */
export type TransactionResultStatus =
  | 'FAILURE'
  | 'PARTIAL_SUCCESS'
  | 'SUCCESS'
  | '%future added value';

export type UnpausedEvent = ContractEvent & {
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedBurnEvent = ContractEvent & {
  readonly amount: Scalars['String']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly sender: AddressOrContract;
  /** Indexed; matches existing unshielded_utxos.token_type index. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedMintEvent = ContractEvent & {
  readonly amount: Scalars['String']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** Indexed; matches existing unshielded_utxos.token_type index. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedReceiveEvent = ContractEvent & {
  readonly amount: Scalars['String']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly recipient: AddressOrContract;
  /** Indexed; matches existing unshielded_utxos.token_type index. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedSpendEvent = ContractEvent & {
  readonly amount: Scalars['String']['output'];
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly maxId: Scalars['Int']['output'];
  readonly protocolVersion: Scalars['Int']['output'];
  readonly raw: Scalars['HexEncoded']['output'];
  /** Indexed. */
  readonly sender: AddressOrContract;
  /** Indexed; matches existing unshielded_utxos.token_type index. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  readonly transactionId: Scalars['Int']['output'];
  readonly version: Scalars['Int']['output'];
};

/** A transaction that created and/or spent UTXOs alongside these and other information. */
export type UnshieldedTransaction = {
  /** UTXOs created in the above transaction, possibly empty. */
  readonly createdUtxos: ReadonlyArray<UnshieldedUtxo>;
  /** UTXOs spent in the above transaction, possibly empty. */
  readonly spentUtxos: ReadonlyArray<UnshieldedUtxo>;
  /** The transaction that created and/or spent UTXOs. */
  readonly transaction: Transaction;
};

/** An event of the unshielded transactions subscription. */
export type UnshieldedTransactionsEvent = UnshieldedTransaction | UnshieldedTransactionsProgress;

/** Information about the unshielded indexing progress. */
export type UnshieldedTransactionsProgress = {
  /** The highest transaction ID of all currently known transactions for a subscribed address. */
  readonly highestTransactionId: Scalars['Int']['output'];
};

/** Represents an unshielded UTXO. */
export type UnshieldedUtxo = {
  /** Transaction that created this UTXO. */
  readonly createdAtTransaction: Transaction;
  /** The creation time in seconds. */
  readonly ctime: Maybe<Scalars['Int']['output']>;
  /** The hex-encoded initial nonce for DUST generation tracking. */
  readonly initialNonce: Scalars['HexEncoded']['output'];
  /** The hex-encoded serialized intent hash. */
  readonly intentHash: Scalars['HexEncoded']['output'];
  /** Index of this output within its creating transaction. */
  readonly outputIndex: Scalars['Int']['output'];
  /** Owner Bech32m-encoded address. */
  readonly owner: Scalars['UnshieldedAddress']['output'];
  /** Whether this UTXO is registered for DUST generation. */
  readonly registeredForDustGeneration: Scalars['Boolean']['output'];
  /** Transaction that spent this UTXO. */
  readonly spentAtTransaction: Maybe<Transaction>;
  /** Token hex-encoded serialized token type. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** UTXO value (quantity) as a string to support u128. */
  readonly value: Scalars['String']['output'];
};

/** A zswap related ledger event. */
export type ZswapLedgerEvent = {
  /** The ID of this zswap ledger event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all zswap ledger events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event. */
  readonly raw: Scalars['HexEncoded']['output'];
};

export type BlockHashQueryQueryVariables = Exact<{
  offset: InputMaybe<BlockOffset>;
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
  address: Scalars['HexEncoded']['input'];
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
  address: Scalars['HexEncoded']['input'];
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
  address: Scalars['HexEncoded']['input'];
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
  offset: InputMaybe<BlockOffset>;
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
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type ContractStateQueryQuery = { readonly contractAction:
    | { readonly state: string }
    | { readonly state: string }
    | { readonly state: string }
   | null };

export type ContractStateSubSubscriptionVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
}>;


export type ContractStateSubSubscription = { readonly contractActions:
    | { readonly state: string }
    | { readonly state: string }
    | { readonly state: string }
   };

export type BothStateQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type BothStateQueryQuery = { readonly contractAction:
    | { readonly state: string, readonly zswapState: string, readonly transaction:
        | { readonly block: { readonly ledgerParameters: string } }
        | { readonly block: { readonly ledgerParameters: string } }
       }
    | { readonly state: string, readonly zswapState: string, readonly transaction:
        | { readonly block: { readonly ledgerParameters: string } }
        | { readonly block: { readonly ledgerParameters: string } }
       }
    | { readonly state: string, readonly zswapState: string, readonly transaction:
        | { readonly block: { readonly ledgerParameters: string } }
        | { readonly block: { readonly ledgerParameters: string } }
       }
   | null };

export type UnshieldedBalanceQueryQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
}>;


export type UnshieldedBalanceQueryQuery = { readonly contractAction:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   | null };

export type QueryUnshieldedBalancesWithOffsetQueryVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<ContractActionOffset>;
}>;


export type QueryUnshieldedBalancesWithOffsetQuery = { readonly contractAction:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   | null };

export type UnshieldedBalanceSubSubscriptionVariables = Exact<{
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
}>;


export type UnshieldedBalanceSubSubscription = { readonly contractActions:
    | { readonly deploy: { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> } }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
    | { readonly unshieldedBalances: ReadonlyArray<{ readonly tokenType: string, readonly amount: string }> }
   };


export const BlockHashQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BLOCK_HASH_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<BlockHashQueryQuery, BlockHashQueryQueryVariables>;
export const TxIdQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TX_ID_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionOffset"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxIdQueryQuery, TxIdQueryQueryVariables>;
export const DeployTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"protocolVersion"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedCreatedOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unshieldedSpentOutputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"intentHash"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}},{"kind":"Field","name":{"kind":"Name","value":"fees"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimatedFees"}},{"kind":"Field","name":{"kind":"Name","value":"paidFees"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transactionResult"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployTxQueryQuery, DeployTxQueryQueryVariables>;
export const DeployContractStateTxQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DEPLOY_CONTRACT_STATE_TX_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeployContractStateTxQueryQuery, DeployContractStateTxQueryQueryVariables>;
export const LatestContractTxBlockHeightQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]} as unknown as DocumentNode<LatestContractTxBlockHeightQueryQuery, LatestContractTxBlockHeightQueryQueryVariables>;
export const TxsFromBlockSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"TXS_FROM_BLOCK_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blocks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"transactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"address"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RegularTransaction"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifiers"}}]}}]}}]}}]}}]} as unknown as DocumentNode<TxsFromBlockSubSubscription, TxsFromBlockSubSubscriptionVariables>;
export const ContractStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CONTRACT_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateQueryQuery, ContractStateQueryQueryVariables>;
export const ContractStateSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CONTRACT_STATE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<ContractStateSubSubscription, ContractStateSubSubscriptionVariables>;
export const BothStateQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BOTH_STATE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"zswapState"}},{"kind":"Field","name":{"kind":"Name","value":"transaction"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerParameters"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BothStateQueryQuery, BothStateQueryQueryVariables>;
export const UnshieldedBalanceQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_QUERY"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceQueryQuery, UnshieldedBalanceQueryQueryVariables>;
export const QueryUnshieldedBalancesWithOffsetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QUERY_UNSHIELDED_BALANCES_WITH_OFFSET"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ContractActionOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<QueryUnshieldedBalancesWithOffsetQuery, QueryUnshieldedBalancesWithOffsetQueryVariables>;
export const UnshieldedBalanceSubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"UNSHIELDED_BALANCE_SUB"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HexEncoded"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BlockOffset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractActions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractDeploy"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractUpdate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContractCall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deploy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshieldedBalances"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokenType"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnshieldedBalanceSubSubscription, UnshieldedBalanceSubSubscriptionVariables>;