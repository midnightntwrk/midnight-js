[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ReadingTheHeadEra

# Reading the network head's era

`PublicDataProvider.queryLatestProtocolVersion` answers one question: which
ledger era will a transaction being built NOW land in. This document records the
caching rule that question imposes, why the method takes no "give me a fresh one"
option, and when to prefer the `protocolVersion` that every read already carries.

The decision behind it is
`docs/adr/0007-never-latch-the-network-head-version.md`.

## Implementations MAY cache, on one condition

The cached answer must expire BY ITSELF, on a bound short relative to block time.
What is forbidden is a reading held indefinitely.

The reason is the fork boundary, which is the one moment the answer matters and
the one moment a stale answer gets it wrong. An era only ever moves FORWARD, so a
reading that has fallen behind cannot be corrected by a later reading of the same
kind — it would have to be recognised as wrong first, and nothing in a head
integer announces that. A cache that expires needs no such recognition.

## Why there is no "force refresh" parameter

It follows from the rule above. Under the bound, every answer is at most one
bound old, so there is nothing for a caller to opt out of.

A parameter would also invite the pattern the rule exists to prevent: a caller
that latches a reading and refreshes it when it suspects a problem, which is
precisely the recognition nothing can supply.

## Prefer the `protocolVersion` on a read

This method is the CONSTRUCT-path counterpart to the `protocolVersion` that every
read on `PublicDataProvider` already carries.

Use that field wherever the era of EXISTING data is the question. It is dated to
the same block as the bytes it describes and costs no extra request. Reach for
this method only where there is no record to date — the deploy path, which has no
prior contract state to read.

## The answer is a lower bound, not a guarantee

It is the era of the block at the head now. Inclusion happens later, and the era
may have advanced by then.

A caller that must be certain confirms after the fact, from the `protocolVersion`
on the finalized record.
