[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / EventSource

# Type Alias: EventSource

> **EventSource** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1391

Where an event originated from

## Properties

### logicalSegment

> **logicalSegment**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1400

The logical event segment, that is, during which segment's execution the
event was emitted.

***

### physicalSegment

> **physicalSegment**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1405

The physical event segment, that is, the segment of the transaction this
event's trigger is contained in.

***

### transactionHash

> **transactionHash**: [`TransactionHash`](TransactionHash.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1395

The hash of the originating transaction.
