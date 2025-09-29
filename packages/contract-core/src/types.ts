import {
  type AlignedValue
} from '@midnight-ntwrk/compact-runtime';
import type { Transcript } from '@midnight-ntwrk/ledger';

// TODO: Move into @midnight-ntwrk/ledger
/**
 * Convenience type for result returned from {@link partitionTranscripts}.
 */
export type PartitionedTranscript = [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined];
