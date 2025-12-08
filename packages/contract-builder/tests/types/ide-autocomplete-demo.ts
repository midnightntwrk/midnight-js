/**
 * IDE Autocomplete Demonstration
 *
 * This file demonstrates the improved type inference and IDE autocomplete
 * for the contract-builder package. Open this file in VSCode to see:
 *
 * 1. Full autocomplete on contract methods
 * 2. Conditional private state methods based on configuration
 * 3. Type-safe witness function signatures
 * 4. Event handler type safety
 */

import { createContractAdapter } from '../../src/index.js';
import type { ContractAdapter } from '../../src/types/adapter-types.js';

// Demo contract interface
type CounterContract = {
  increment(): Promise<void>;
  decrement(): Promise<void>;
  getValue(): Promise<number>;
  reset(): Promise<void>;
};

// Demo private state
type CounterPrivateState = {
  privateCounter: number;
  lastModified: number;
};

// Demo ledger
type CounterLedger = {
  blockNumber: number;
  timestamp: number;
};

// ============================================================================
// Demo 1: Basic contract without private state
// ============================================================================

async function demo1_basicContract() {
  const contractInstance: any = null;

  // Create adapter without private state
  const adapter = await createContractAdapter<CounterContract>(contractInstance)
    .withLogger(console)
    .deploy(null as any);

  // IDE should autocomplete these methods from CounterContract:
  await adapter.increment();
  await adapter.decrement();
  const value = await adapter.getValue();
  await adapter.reset();

  // IDE should show address as string
  const addr: string = adapter.address;

  // Private state methods should return null (not configured)
  const state = await adapter.getPrivateState();
  // state is typed as null (not CounterPrivateState | null)

  // Event handlers are type-safe
  adapter.on('call', (event) => {
    // event.methodName is string
    // event.args is any[]
    // event.timestamp is number
    console.log(event.methodName, event.args, event.timestamp);
  });
}

// ============================================================================
// Demo 2: Contract WITH private state - full type inference
// ============================================================================

async function demo2_contractWithPrivateState() {
  const contractInstance: any = null;

  // Create adapter with private state and witnesses
  const adapter = await createContractAdapter<
    CounterContract,
    CounterLedger,
    CounterPrivateState
  >(contractInstance)
    .withWitnesses({
      privateIncrement: ({ privateState, ledger }) => {
        // IDE autocompletes privateState.privateCounter and privateState.lastModified
        // IDE autocompletes ledger.blockNumber and ledger.timestamp
        return [
          {
            privateCounter: privateState.privateCounter + 1,
            lastModified: ledger.timestamp
          },
          []
        ];
      }
    })
    .withPrivateState({
      initialState: {
        privateCounter: 0,
        lastModified: Date.now()
      }
    })
    .withPrivateStateDebug(true)
    .deploy(null as any);

  // Contract methods still work
  await adapter.increment();

  // Private state is now typed as CounterPrivateState | null
  const state = await adapter.getPrivateState();

  if (state) {
    // IDE autocompletes these fields:
    const counter = state.privateCounter;
    const modified = state.lastModified;

    console.log(counter, modified);
  }

  // Set private state with type safety
  await adapter.setPrivateState({
    privateCounter: 42,
    lastModified: Date.now()
    // IDE will error if you add unknown fields or miss required fields
  });

  // Get state ID
  const stateId = adapter.getPrivateStateId();
  // stateId is typed as string | undefined

  // Witness event handlers are type-safe
  adapter.on('witnessCall', (event) => {
    // event.witnessName is string
    // event.result is [CounterPrivateState, any[]]
    const [newState, outputs] = event.result;

    // IDE autocompletes newState.privateCounter and newState.lastModified
    console.log(newState.privateCounter, newState.lastModified);
  });
}

// ============================================================================
// Demo 3: Type constraints prevent errors at compile time
// ============================================================================

async function demo3_typeConstraints() {
  const contractInstance: any = null;

  const adapter = await createContractAdapter<
    CounterContract,
    CounterLedger,
    CounterPrivateState
  >(contractInstance)
    .withPrivateState({
      initialState: {
        privateCounter: 0,
        lastModified: 0
      }
    })
    .deploy(null as any);

  // These will cause TypeScript errors (commented out to prevent runtime issues):

  // Unknown method would error:
  // adapter.unknownMethod();

  // Wrong field name would error:
  // adapter.setPrivateState({ wrongField: 42 });

  // Missing required field would error:
  // adapter.setPrivateState({ privateCounter: 42 });

  // Wrong type would error:
  // adapter.setPrivateState({ privateCounter: 'not a number', lastModified: 0 });
}

// ============================================================================
// Demo 4: Fluent interface preserves types through chaining
// ============================================================================

async function demo4_fluentInterface() {
  const contractInstance: any = null;

  // Type is preserved through the entire builder chain
  const adapter = await createContractAdapter<
    CounterContract,
    CounterLedger,
    CounterPrivateState
  >(contractInstance)
    .withLogger(console)
    .withRetry({ maxRetries: 3, backoffMs: 1000 })
    .withWitnesses({
      privateIncrement: ({ privateState, ledger }) => [
        { privateCounter: privateState.privateCounter + 1, lastModified: ledger.timestamp },
        []
      ]
    })
    .withPrivateState({ initialState: { privateCounter: 0, lastModified: 0 } })
    .withPrivateStateDebug(true)
    .on('call', (e) => console.log(e))
    .deploy(null as any);

  // All methods are still properly typed after the long chain
  await adapter.increment();
  const state = await adapter.getPrivateState();
}

export const IDE_AUTOCOMPLETE_DEMO = {
  demo1_basicContract,
  demo2_contractWithPrivateState,
  demo3_typeConstraints,
  demo4_fluentInterface
};
