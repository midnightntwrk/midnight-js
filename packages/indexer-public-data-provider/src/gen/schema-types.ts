export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
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
  /** The hex-encoded contract address; populated when kind is CONTRACT. */
  readonly contractAddress: Maybe<Scalars['HexEncoded']['output']>;
  /** Which of the two address fields is populated. */
  readonly kind: AddressOrContractKind;
  /** The hex-encoded user address; populated when kind is USER. */
  readonly userAddress: Maybe<Scalars['HexEncoded']['output']>;
};

/** Discriminator for `AddressOrContract`. */
export type AddressOrContractKind =
  /** The address is a contract address. */
  | 'CONTRACT'
  /** The address is a user (zswap coin public key) address. */
  | 'USER'
  | '%future added value';

/** A block with its relevant data. */
export type Block = {
  /** The hex-encoded block author. */
  readonly author: Maybe<Scalars['HexEncoded']['output']>;
  /**
   * The zswap commitment tree filtered to the given contract address, resolved from this
   * block's ledger state; null if the contract does not exist at this block. Hex-encoded.
   * For building transactions, compose with `ledgerParameters` and `contract { state }` in
   * one request, anchored to the same block; use the latest block: older trees age out of
   * the ledger's root window, and blocks beyond the chain-indexer's ledger state retention
   * window no longer have a loadable ledger state and yield an error.
   */
  readonly contractZswapState: Maybe<Scalars['HexEncoded']['output']>;
  /** The dust commitment tree end index at this block; exclusive, i.e. the next free index. */
  readonly dustCommitmentEndIndex: Scalars['Int']['output'];
  /** The hex-encoded dust commitment Merkle tree root at this block. */
  readonly dustCommitmentMerkleTreeRoot: Maybe<Scalars['HexEncoded']['output']>;
  /** The dust generation tree end index at this block; exclusive, i.e. the next free index. */
  readonly dustGenerationEndIndex: Scalars['Int']['output'];
  /** The hex-encoded dust generation Merkle tree root at this block. */
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


/** A block with its relevant data. */
export type BlockContractZswapStateArgs = {
  address: Scalars['HexEncoded']['input'];
};

/** Either a block hash or a block height. */
export type BlockOffset =
  /** A hex-encoded block hash. */
  { readonly hash: Scalars['HexEncoded']['input']; readonly height?: never; }
  |  /** A block height. */
  { readonly hash?: never; readonly height: Scalars['Int']['input']; };

/** A block's height, hash and protocol version. Query `block` with the hash for the full block. */
export type BlockReference = {
  /** The block hash. */
  readonly hash: Scalars['HexEncoded']['output'];
  /** The block height. */
  readonly height: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
};

/** Per-address bridge balance. */
export type BridgeBalance = {
  /**
   * Remaining claimable, read from the ledger's `bridge_receiving` map (net, zero once fully
   * claimed). 16-byte big-endian u128.
   */
  readonly balance: Scalars['HexEncoded']['output'];
  /** Sum of bridge claim amounts for this address, net/post-fee (16-byte big-endian u128). */
  readonly claimed: Scalars['HexEncoded']['output'];
  /** Sum of UserTransfer amounts for this address, gross/pre-fee (16-byte big-endian u128). */
  readonly deposited: Scalars['HexEncoded']['output'];
};

/**
 * A claim of bridged NIGHT: a regular `ClaimRewards` transaction whose `ClaimKind` is
 * `CardanoBridge`. Structurally a regular transaction, surfaced as its own type so consumers can
 * tell it apart and read the bridged `recipient` and `amount` directly.
 */
export type BridgeClaimTransaction = Transaction & {
  /** The claimed amount as 16-byte big-endian u128. */
  readonly amount: Scalars['HexEncoded']['output'];
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
  /** The Midnight address the bridged NIGHT is claimed to. */
  readonly recipient: Scalars['HexEncoded']['output'];
  /** Unshielded UTXOs created by this transaction. */
  readonly unshieldedCreatedOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** Unshielded UTXOs spent (consumed) by this transaction. */
  readonly unshieldedSpentOutputs: ReadonlyArray<UnshieldedUtxo>;
  /** Zswap ledger events of this transaction. */
  readonly zswapLedgerEvents: ReadonlyArray<ZswapLedgerEvent>;
};

/** Polymorphic c2m-bridge event. Each concrete variant exposes its own additional fields. */
export type BridgeEvent = {
  readonly blockHeight: Scalars['Int']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
};

/** GraphQL discriminator for bridge events. */
export type BridgeEventVariant =
  | 'INVALID_TRANSFER'
  | 'RESERVE_TRANSFER'
  | 'SUBMINIMAL_FLUSH_TRANSFER'
  | 'UNAPPROVED_TRANSFER'
  | 'USER_TRANSFER'
  | '%future added value';

/** Malformed bridge metadata. NIGHT redirected to treasury. */
export type BridgeInvalidTransfer = BridgeEvent & {
  readonly amount: Scalars['HexEncoded']['output'];
  readonly blockHeight: Scalars['Int']['output'];
  readonly cardanoTxHash: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
};

/** Aggregate bridge inflows snapshot. */
export type BridgePoolSummary = {
  readonly lastEventBlockHeight: Maybe<Scalars['Int']['output']>;
  /** Cumulative ReserveTransfer amount (16-byte big-endian u128). */
  readonly reserveTotal: Scalars['HexEncoded']['output'];
  /** Sum of `count` from SubminimalFlushTransfer events. */
  readonly subminimumTxCount: Scalars['Int']['output'];
  readonly treasuryByReason: ReadonlyArray<BridgeTreasuryAggregate>;
};

/** Pair of latest bridge event and refreshed pool summary, emitted by `bridgePoolUpdates`. */
export type BridgePoolUpdate = {
  /** The triggering event, or None for the initial snapshot on subscribe. */
  readonly newEvent: Maybe<BridgeEvent>;
  readonly pool: BridgePoolSummary;
};

/** Reserve top-up. NIGHT credited to the protocol Reserve pool. */
export type BridgeReserveTransfer = BridgeEvent & {
  readonly amount: Scalars['HexEncoded']['output'];
  readonly blockHeight: Scalars['Int']['output'];
  readonly cardanoTxHash: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
};

/** Aggregated subminimum transfers flushed to treasury. */
export type BridgeSubminimalFlushTransfer = BridgeEvent & {
  readonly amount: Scalars['HexEncoded']['output'];
  readonly blockHeight: Scalars['Int']['output'];
  /** Number of subminimum Cardano txs aggregated into this flush. */
  readonly count: Scalars['Int']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
};

/** Treasury inflow aggregate by reason. */
export type BridgeTreasuryAggregate = {
  readonly count: Scalars['Int']['output'];
  readonly reason: BridgeTreasuryReason;
  /** Cumulative amount (16-byte big-endian u128). */
  readonly total: Scalars['HexEncoded']['output'];
};

/** GraphQL discriminator for treasury redirection reasons. */
export type BridgeTreasuryReason =
  | 'INVALID'
  | 'SUBMINIMAL_FLUSH'
  | 'UNAPPROVED'
  | '%future added value';

/** User deposit not in `ApprovedTransactions` at observation time. NIGHT redirected to treasury. */
export type BridgeUnapprovedTransfer = BridgeEvent & {
  readonly amount: Scalars['HexEncoded']['output'];
  readonly blockHeight: Scalars['Int']['output'];
  readonly cardanoTxHash: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
  /** The recipient parsed from metadata (would have received NIGHT if approved). */
  readonly recipient: Scalars['HexEncoded']['output'];
};

/** Approved user deposit. NIGHT credited to `recipient`. */
export type BridgeUserTransfer = BridgeEvent & {
  /** Amount as 8-byte big-endian u64 NIGHT (in stars). */
  readonly amount: Scalars['HexEncoded']['output'];
  readonly blockHeight: Scalars['Int']['output'];
  readonly cardanoTxHash: Scalars['HexEncoded']['output'];
  readonly id: Scalars['Int']['output'];
  readonly midnightTxHash: Scalars['HexEncoded']['output'];
  readonly recipient: Scalars['HexEncoded']['output'];
};

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

/**
 * A contract, identified by address, resolved as of a given block (or the latest state if no
 * offset is given). The topmost contract concept; its actions are a sub-query.
 */
export type Contract = {
  /**
   * Recent contract actions for this contract, newest first, optionally filtered by type;
   * `limit` defaults to 100 and is capped at 500. Use the `contractActions` subscription to
   * enumerate all actions.
   */
  readonly actions: ReadonlyArray<ContractAction>;
  /** The hex-encoded contract address. */
  readonly address: Scalars['HexEncoded']['output'];
  /** The contract's maintenance authority as of the queried block. */
  readonly maintenanceAuthority: ContractMaintenanceAuthority;
  /**
   * The hex-encoded serialized contract state as of the queried block (the latest contract
   * action at or before it), in that block's encoding; as of the latest block if no offset is
   * given.
   */
  readonly state: Scalars['HexEncoded']['output'];
  /**
   * The block at which `state` last changed: the latest action's block, or a later block at which
   * the state was translated to a new ledger version.
   */
  readonly stateAt: BlockReference;
};


/**
 * A contract, identified by address, resolved as of a given block (or the latest state if no
 * offset is given). The topmost contract concept; its actions are a sub-query.
 */
export type ContractActionsArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  type: InputMaybe<ContractActionType>;
};

/** A contract action. */
export type ContractAction = {
  readonly address: Scalars['HexEncoded']['output'];
  readonly state: Scalars['HexEncoded']['output'];
  readonly stateAt: BlockReference;
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

/** Contract action variant, used to filter `Contract.actions`. */
export type ContractActionType =
  | 'CALL'
  | 'DEPLOY'
  | 'UPDATE'
  | '%future added value';

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
   * `ContractUpdate` don't execute circuits with the `emit` expression.
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
  /**
   * The hex-encoded serialized contract state at the end of this action's block, in the encoding
   * of the block the query is anchored to: the latest block for `contractAction` without an
   * offset, the fork block for a `contractActions` re-emission, otherwise the action's own
   * block.
   */
  readonly state: Scalars['HexEncoded']['output'];
  /**
   * The block at which `state` last changed: this action's block, or a later block at which the
   * state was translated to a new ledger version.
   */
  readonly stateAt: BlockReference;
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
  /**
   * The hex-encoded serialized contract state at the end of this action's block, in the encoding
   * of the block the query is anchored to: the latest block for `contractAction` without an
   * offset, the fork block for a `contractActions` re-emission, otherwise the action's own
   * block.
   */
  readonly state: Scalars['HexEncoded']['output'];
  /**
   * The block at which `state` last changed: this action's block, or a later block at which the
   * state was translated to a new ledger version.
   */
  readonly stateAt: BlockReference;
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
 * Filter for contract events queries and subscriptions; block-range bounds live here so the
 * same shape works for both.
 */
export type ContractEventFilter = {
  /** The hex-encoded contract address to filter events for. */
  readonly contractAddress: Scalars['HexEncoded']['input'];
  /**
   * Prefix matches on indexed event fields, combined with AND semantics; standard events
   * only.
   */
  readonly fieldPrefixes: InputMaybe<ReadonlyArray<FieldPrefixFilter>>;
  /**
   * Lower bound on the block height an event was emitted in; on subscription this acts as
   * a starting cursor alongside `id`.
   */
  readonly fromBlock: InputMaybe<Scalars['Int']['input']>;
  /**
   * Upper bound on the block height an event was emitted in; on subscription, the stream
   * completes once the chain has reached this block.
   */
  readonly toBlock: InputMaybe<Scalars['Int']['input']>;
  /** The hex-encoded transaction hash to narrow to events emitted by that transaction. */
  readonly transactionHash: InputMaybe<Scalars['HexEncoded']['input']>;
  /** Event types to narrow to; must be non-empty when given. */
  readonly types: InputMaybe<ReadonlyArray<ContractEventType>>;
};

/**
 * Closed enum of contract event types the indexer surfaces. Used in filter
 * input only, response discrimination is via `__typename`.
 */
export type ContractEventType =
  /** A custom event emitted by a contract. */
  | 'MISC'
  /** A contract is paused. */
  | 'PAUSED'
  /** A contract burns a shielded coin. */
  | 'SHIELDED_BURN'
  /** A contract mints a shielded coin. */
  | 'SHIELDED_MINT'
  /** A contract or user receives a shielded coin. */
  | 'SHIELDED_RECEIVE'
  /** A contract spends a shielded coin. */
  | 'SHIELDED_SPEND'
  /** A contract is unpaused. */
  | 'UNPAUSED'
  /** A contract burns an unshielded coin. */
  | 'UNSHIELDED_BURN'
  /** A contract mints an unshielded coin. */
  | 'UNSHIELDED_MINT'
  /** A contract or user receives an unshielded coin. */
  | 'UNSHIELDED_RECEIVE'
  /** A contract spends an unshielded coin. */
  | 'UNSHIELDED_SPEND'
  | '%future added value';

/** The maintenance authority of a contract. */
export type ContractMaintenanceAuthority = {
  /** The committee of verifying keys authorised to maintain the contract. */
  readonly committee: ReadonlyArray<ContractMaintenanceVerifyingKey>;
  /** Monotonic counter guarding against replay of maintenance operations. */
  readonly counter: Scalars['Int']['output'];
  /** The number of committee signatures required to authorise maintenance. */
  readonly threshold: Scalars['Int']['output'];
};

/** A verifying key in a contract maintenance authority committee. */
export type ContractMaintenanceVerifyingKey = {
  /** The hex-encoded tagged-serialized verifying key. */
  readonly key: Scalars['HexEncoded']['output'];
  /** The signature scheme of the key. */
  readonly kind: ContractMaintenanceVerifyingKeyKind;
};

/** The signature scheme of a maintenance authority verifying key. */
export type ContractMaintenanceVerifyingKeyKind =
  | 'ECDSA'
  | 'SCHNORR'
  | '%future added value';

/** A contract update. */
export type ContractUpdate = ContractAction & {
  /** The hex-encoded serialized address. */
  readonly address: Scalars['HexEncoded']['output'];
  /**
   * The hex-encoded serialized contract state at the end of this action's block, in the encoding
   * of the block the query is anchored to: the latest block for `contractAction` without an
   * offset, the fork block for a `contractActions` re-emission, otherwise the action's own
   * block.
   */
  readonly state: Scalars['HexEncoded']['output'];
  /**
   * The block at which `state` last changed: this action's block, or a later block at which the
   * state was translated to a new ledger version.
   */
  readonly stateAt: BlockReference;
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
  /**
   * The protocol version at the snapshot's block, i.e. the one this snapshot is encoded at.
   * Allows a wallet without any generations to observe a protocol upgrade, which it would
   * otherwise only learn about from the items it receives.
   */
  readonly protocolVersion: Scalars['Int']['output'];
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

/** Prefix filter on an indexed field of a standard event; not supported on Misc events. */
export type FieldPrefixFilter = {
  /**
   * The indexed field name; one of `nullifier`, `commitment`, `ciphertext`, `domainSep`,
   * `tokenType`, `sender` or `recipient`.
   */
  readonly fieldName: Scalars['String']['input'];
  /**
   * The hex-encoded field value prefix. An empty string matches all values; otherwise
   * events whose field value starts with this prefix are returned.
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
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The hex-encoded contract-defined event name (32 bytes). */
  readonly name: Scalars['HexEncoded']['output'];
  /**
   * The hex-encoded opaque event payload, up to 256 bytes; consumers decode it with their
   * contract's descriptor.
   */
  readonly payload: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
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
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
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
  /** Get the c2m-bridge balance summary (deposited, claimed, balance) for an address. */
  readonly bridgeBalance: BridgeBalance;
  /**
   * Convenience query for a recipient's deposit history. By default returns only successful
   * `UserTransfer` events; pass `includeUnapproved: true` to also include `UnapprovedTransfer`.
   */
  readonly bridgeDeposits: ReadonlyArray<BridgeEvent>;
  /** List c2m-bridge events with optional filters. */
  readonly bridgeEvents: ReadonlyArray<BridgeEvent>;
  /** Aggregate snapshot of bridge inflows to protocol pools (Reserve and Treasury). */
  readonly bridgePoolSummary: BridgePoolSummary;
  /** List Reserve top-up events (ReserveTransfer), optionally bounded by block height. */
  readonly bridgeReserveInflows: ReadonlyArray<BridgeEvent>;
  /**
   * List treasury-redirected events (Invalid, Unapproved, SubminimalFlush), optionally
   * filtered by reason and block range.
   */
  readonly bridgeTreasuryInflows: ReadonlyArray<BridgeEvent>;
  /** Get committee membership for an epoch. */
  readonly committee: ReadonlyArray<CommitteeMember>;
  /**
   * Find a contract by address, resolved as of the given block offset (or its latest state if no
   * offset is given). Returns null if the contract has no action at or before that block.
   */
  readonly contract: Maybe<Contract>;
  /** Find a contract action for the given address and optional offset. */
  readonly contractAction: Maybe<ContractAction>;
  /**
   * Find contract events matching the filter, ordered by ID; `limit` defaults to 100 and is
   * capped at 500, `offset` defaults to 0.
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


export type QueryBridgeBalanceArgs = {
  address: Scalars['HexEncoded']['input'];
};


export type QueryBridgeDepositsArgs = {
  includeUnapproved: InputMaybe<Scalars['Boolean']['input']>;
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  recipient: Scalars['HexEncoded']['input'];
};


export type QueryBridgeEventsArgs = {
  blockHeightFrom: InputMaybe<Scalars['Int']['input']>;
  blockHeightTo: InputMaybe<Scalars['Int']['input']>;
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  recipient: InputMaybe<Scalars['HexEncoded']['input']>;
  variant: InputMaybe<BridgeEventVariant>;
};


export type QueryBridgePoolSummaryArgs = {
  atBlock: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBridgeReserveInflowsArgs = {
  blockHeightFrom: InputMaybe<Scalars['Int']['input']>;
  blockHeightTo: InputMaybe<Scalars['Int']['input']>;
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBridgeTreasuryInflowsArgs = {
  blockHeightFrom: InputMaybe<Scalars['Int']['input']>;
  blockHeightTo: InputMaybe<Scalars['Int']['input']>;
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
  reason: InputMaybe<BridgeTreasuryReason>;
};


export type QueryCommitteeArgs = {
  epoch: Scalars['Int']['input'];
};


export type QueryContractArgs = {
  address: Scalars['HexEncoded']['input'];
  offset: InputMaybe<BlockOffset>;
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
  /** The optional amount as a decimal string; hidden in some shielded burns. */
  readonly amount: Maybe<Scalars['String']['output']>;
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The hex-encoded nullifier; filterable via `fieldPrefixes`. */
  readonly nullifier: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type ShieldedMintEvent = ContractEvent & {
  /** The optional amount as a decimal string; hidden in some shielded mints. */
  readonly amount: Maybe<Scalars['String']['output']>;
  /** The hex-encoded commitment; filterable via `fieldPrefixes`. */
  readonly commitment: Scalars['HexEncoded']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The hex-encoded domain separator; filterable via `fieldPrefixes`. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
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
   * The hex-encoded optional ciphertext of the shielded coin receipt, up to 512 bytes;
   * filterable via `fieldPrefixes`.
   */
  readonly ciphertext: Maybe<Scalars['HexEncoded']['output']>;
  /** The hex-encoded commitment; filterable via `fieldPrefixes`. */
  readonly commitment: Scalars['HexEncoded']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /**
   * The hex-encoded receiving contract address; set when received by a contract, null for
   * user recipients. Named to avoid collision with the emitting `contractAddress`.
   */
  readonly receivingContractAddress: Maybe<Scalars['HexEncoded']['output']>;
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type ShieldedSpendEvent = ContractEvent & {
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The hex-encoded nullifier; filterable via `fieldPrefixes`. */
  readonly nullifier: Scalars['HexEncoded']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
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
  /**
   * The protocol version at the tip of the chain, i.e. the one currently in effect, not the
   * one the transactions of this subscription were indexed at. Allows a wallet without any
   * relevant transactions to observe a protocol upgrade, which it would otherwise only learn
   * about from the transactions it receives. A value of zero means that no block has been
   * indexed yet.
   */
  readonly protocolVersion: Scalars['Int']['output'];
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
   * Subscribe to a recipient's bridge balance. Emits the current balance on subscribe and
   * re-emits whenever a bridge event for the recipient indexes or the recipient's unshielded
   * UTXOs change (a claim emits no bridge event, but it creates unshielded UTXOs for
   * the recipient).
   */
  readonly bridgeBalance: BridgeBalance;
  /**
   * Subscribe to c2m-bridge events.
   *
   * Backfills events with id > `from` then live-tails new events. Filters apply across both
   * phases.
   */
  readonly bridgeEvents: BridgeEvent;
  /**
   * Subscribe to bridge pool updates. Emits a snapshot of the pool summary alongside each
   * pool-affecting event (Reserve, Invalid, Unapproved, SubminimalFlush). Useful for
   * observability dashboards.
   */
  readonly bridgePoolUpdates: BridgePoolUpdate;
  /**
   * Subscribe to contract actions with the given address starting at the given offset or at the
   * latest block if the offset is omitted.
   *
   * At a ledger hard fork, a contract without an action in the fork block has its latest action
   * re-emitted with the translated `state` and `stateAt` set to the fork block.
   */
  readonly contractActions: ContractAction;
  /**
   * Subscribe to contract events matching the given filter, starting at the given event ID
   * (inclusive) and returning events in monotonic ID order; completes once the chain has
   * reached `filter.toBlock` if that is set.
   */
  readonly contractEvents: ContractEvent;
  /**
   * Subscribe to a dust address's generations as a consistent snapshot at `block_hash`. The
   * wallet's owned generation entries, interleaved with collapsed Merkle tree updates for the
   * non-owned gaps, are served at that block's state (deterministic, independent of the tip).
   * The dtime updates for the wallet's own generations in `(dtime_cutoff_height, block_hash]`
   * are issued first, as a clean delta for the generations set rather than the tree (pass `0`
   * to replay all). The subscription completes once emitted; re-subscribe at a newer
   * `block_hash` to advance.
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


export type SubscriptionBridgeBalanceArgs = {
  address: Scalars['HexEncoded']['input'];
};


export type SubscriptionBridgeEventsArgs = {
  from: InputMaybe<Scalars['Int']['input']>;
  recipient: InputMaybe<Scalars['HexEncoded']['input']>;
  variant: InputMaybe<BridgeEventVariant>;
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
  blockHash: Scalars['HexEncoded']['input'];
  dtimeCutoffHeight: Scalars['Int']['input'];
  dustAddress: Scalars['DustAddress']['input'];
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
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedBurnEvent = ContractEvent & {
  /** The amount as a decimal string. */
  readonly amount: Scalars['String']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The spending user or contract address; filterable via `fieldPrefixes`. */
  readonly sender: AddressOrContract;
  /** The hex-encoded token type; filterable via `fieldPrefixes`. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedMintEvent = ContractEvent & {
  /** The amount as a decimal string. */
  readonly amount: Scalars['String']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The hex-encoded domain separator; filterable via `fieldPrefixes`. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The hex-encoded token type; filterable via `fieldPrefixes`. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedReceiveEvent = ContractEvent & {
  /** The amount as a decimal string. */
  readonly amount: Scalars['String']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The hex-encoded domain separator; filterable via `fieldPrefixes`. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The receiving user or contract address; filterable via `fieldPrefixes`. */
  readonly recipient: AddressOrContract;
  /** The hex-encoded token type; filterable via `fieldPrefixes`. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
  readonly version: Scalars['Int']['output'];
};

export type UnshieldedSpendEvent = ContractEvent & {
  /** The amount as a decimal string. */
  readonly amount: Scalars['String']['output'];
  /** The hex-encoded address of the emitting contract. */
  readonly contractAddress: Scalars['HexEncoded']['output'];
  /** The hex-encoded domain separator; filterable via `fieldPrefixes`. */
  readonly domainSep: Scalars['HexEncoded']['output'];
  /** The ID of this contract event. */
  readonly id: Scalars['Int']['output'];
  /** The maximum ID of all contract events. */
  readonly maxId: Scalars['Int']['output'];
  /** The protocol version. */
  readonly protocolVersion: Scalars['Int']['output'];
  /** The hex-encoded serialized event payload. */
  readonly raw: Scalars['HexEncoded']['output'];
  /** The spending user or contract address; filterable via `fieldPrefixes`. */
  readonly sender: AddressOrContract;
  /** The hex-encoded token type; filterable via `fieldPrefixes`. */
  readonly tokenType: Scalars['HexEncoded']['output'];
  /** The transaction this event was emitted from. */
  readonly transaction: Transaction;
  /** The ID of the transaction this event was emitted from. */
  readonly transactionId: Scalars['Int']['output'];
  /** The event schema version, as declared by the emitting contract's compiler. */
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
  /**
   * The protocol version at the tip of the chain, i.e. the one currently in effect, not the
   * one the transactions of this subscription were indexed at. Allows a wallet without any
   * transactions to observe a protocol upgrade, which it would otherwise only learn about
   * from the transactions it receives. A value of zero means that no block has been indexed
   * yet.
   */
  readonly protocolVersion: Scalars['Int']['output'];
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
  /**
   * Whether this UTXO is registered for DUST generation.
   *
   * Reported against the chain's current DUST epoch, so a fork that wipes DUST
   * state (ledger 8 -> 9) turns this to `false` for every UTXO it strands,
   * matching the ledger rather than the value recorded when the UTXO was
   * created.
   */
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
