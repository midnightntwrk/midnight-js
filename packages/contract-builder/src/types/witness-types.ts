// Re-export WitnessContext from compact-runtime to ensure type compatibility
export type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Import WitnessContext to define dependent types
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Define witness function and witnesses types based on compact-runtime's WitnessContext
export type WitnessFunction<TLedger = any, TPrivateState = any> = (
  context: WitnessContext<TLedger, TPrivateState>
) => [TPrivateState, any[]];

export type Witnesses<TLedger = any, TPrivateState = any> = Record<
  string,
  WitnessFunction<TLedger, TPrivateState>
>;

export interface WitnessCallEvent<TPrivateState = any> {
  witnessName: string;
  context: WitnessContext<any, TPrivateState>;
  result: [TPrivateState, any[]];
}
