/**
 * Type-level tests for compile-time validation
 *
 * These tests verify that TypeScript type inference works correctly.
 * If any test fails, TypeScript will show a compilation error.
 */

import { createContractAdapter } from '../../src/adapter/ContractAdapterBuilder.js';
import type { PrivateStateConfig } from '../../src/config/PrivateStateConfig.js';
import type { ContractAdapter } from '../../src/types/adapter-types.js';
import type { Witnesses } from '../../src/types/witness-types.js';

// Test types
type TestContract = {
  increment(): Promise<void>;
  getValue(): Promise<number>;
  reset(): Promise<void>;
};

type TestPrivateState = {
  privateCounter: number;
  lastUpdated: number;
};

type TestLedger = {
  blockNumber: number;
};

// ============================================================================
// Test 1: Basic contract adapter without private state
// ============================================================================

type Test1_BasicAdapter = ContractAdapter<TestContract>;

// Should have contract methods
const test1_methods: Test1_BasicAdapter = null as any;
test1_methods.increment satisfies () => Promise<void>;
test1_methods.getValue satisfies () => Promise<number>;
test1_methods.reset satisfies () => Promise<void>;

// Should have address and deployTxData
test1_methods.address satisfies string;
test1_methods.deployTxData satisfies any;

// Should have getPrivateState but it returns null (no private state configured)
test1_methods.getPrivateState satisfies () => Promise<null>;

// ============================================================================
// Test 2: Contract adapter WITH private state
// ============================================================================

type Test2_AdapterWithState = ContractAdapter<TestContract, TestPrivateState>;

const test2_methods: Test2_AdapterWithState = null as any;

// Should have contract methods
test2_methods.increment satisfies () => Promise<void>;
test2_methods.getValue satisfies () => Promise<number>;

// Should have typed private state methods
test2_methods.getPrivateState satisfies () => Promise<TestPrivateState | null>;
test2_methods.setPrivateState satisfies (state: TestPrivateState) => Promise<void>;
test2_methods.getPrivateStateId satisfies () => string | undefined;

// ============================================================================
// Test 3: Private state type safety
// ============================================================================

async function test3_privateStateTypeSafety() {
  const adapter: ContractAdapter<TestContract, TestPrivateState> = null as any;

  // Get private state should return the correct type
  const state = await adapter.getPrivateState();

  if (state) {
    // Should have autocomplete for private state fields
    state.privateCounter satisfies number;
    state.lastUpdated satisfies number;

    // @ts-expect-error - Should error on non-existent field
    state.nonExistent;
  }

  // Set private state should accept the correct type
  await adapter.setPrivateState({
    privateCounter: 42,
    lastUpdated: Date.now()
  });

  // @ts-expect-error - Should error when missing required fields
  await adapter.setPrivateState({
    // @ts-expect-error - Should error on wrong type
    privateCounter: 42
  });

  await adapter.setPrivateState({
    // @ts-expect-error - Should error on wrong type
    privateCounter: 'not a number',
    lastUpdated: Date.now()
  });
}

// ============================================================================
// Test 4: Builder type inference
// ============================================================================

async function test4_builderTypeInference() {
  const contractInstance: any = null;

  // Type inference should flow through builder methods
  const adapter1 = await createContractAdapter<TestContract>(contractInstance).deploy(null as any);

  // adapter1 should not have typed private state
  adapter1.getPrivateState satisfies () => Promise<null>;

  // With private state configuration
  const adapter2 = await createContractAdapter<TestContract, TestLedger, TestPrivateState>(
    contractInstance
  )
    .withPrivateState({
      initialState: {
        privateCounter: 0,
        lastUpdated: Date.now()
      }
    })
    .deploy(null as any);

  // adapter2 should have typed private state
  adapter2.getPrivateState satisfies () => Promise<TestPrivateState | null>;
  adapter2.setPrivateState satisfies (state: TestPrivateState) => Promise<void>;
}

// ============================================================================
// Test 5: Witness type inference
// ============================================================================

function test5_witnessTypeInference() {
  const witnesses: Witnesses<TestLedger, TestPrivateState> = {
    incrementCounter: ({ privateState, ledger }) => {
      // Should have autocomplete on privateState
      privateState.privateCounter satisfies number;
      privateState.lastUpdated satisfies number;

      // Should have autocomplete on ledger
      ledger.blockNumber satisfies number;

      return [
        {
          privateCounter: privateState.privateCounter + 1,
          lastUpdated: Date.now()
        },
        []
      ];
    }
  };

  // Witnesses should be typed correctly
  witnesses.incrementCounter satisfies (context: any) => [TestPrivateState, any[]];
}

// ============================================================================
// Test 6: Private state config type safety
// ============================================================================

function test6_privateStateConfigTypeSafety() {
  // Valid config
  const validConfig: PrivateStateConfig<TestPrivateState> = {
    stateId: 'test',
    initialState: {
      privateCounter: 0,
      lastUpdated: Date.now()
    },
    debug: true
  };

  const invalidConfig1: PrivateStateConfig<TestPrivateState> = {
    initialState: {
      // @ts-expect-error - Should error when initial state is wrong type
      wrongField: 'test'
    }
  };

  const invalidConfig2: PrivateStateConfig<TestPrivateState> = {
    // @ts-expect-error - Should error when initial state is missing required fields
    initialState: {
      privateCounter: 0
    }
  };
}

// ============================================================================
// Test 7: Event handler type safety
// ============================================================================

async function test7_eventHandlerTypeSafety() {
  const adapter: ContractAdapter<TestContract, TestPrivateState> = null as any;

  // Event handlers should have correct signatures
  adapter.on('call', event => {
    event.methodName satisfies string;
    event.args satisfies any[];
    event.timestamp satisfies number;
  });

  adapter.on('success', event => {
    event.methodName satisfies string;
    event.result satisfies any;
    event.duration satisfies number;
  });

  adapter.on('error', event => {
    event.methodName satisfies string;
    event.error satisfies any;
  });

  adapter.on('witnessCall', event => {
    event.witnessName satisfies string;
    event.context satisfies any;
    event.result satisfies [TestPrivateState, any[]];
  });
}

// ============================================================================
// Test 8: Method chaining type preservation
// ============================================================================

async function test8_methodChainingPreservesTypes() {
  const contractInstance: any = null;

  // Type should be preserved through chaining
  const adapter = await createContractAdapter<TestContract, TestLedger, TestPrivateState>(
    contractInstance
  )
    .withLogger(null as any)
    .withRetry({ maxRetries: 3, backoffMs: 1000 })
    .withWitnesses({} as any)
    .withPrivateState({ initialState: { privateCounter: 0, lastUpdated: 0 } })
    .withPrivateStateDebug(true)
    .on('call', () => {})
    .deploy(null as any);

  // Should still have all typed methods
  adapter.increment satisfies () => Promise<void>;
  adapter.getValue satisfies () => Promise<number>;
  adapter.getPrivateState satisfies () => Promise<TestPrivateState | null>;
}

// ============================================================================
// SUCCESS: If this file compiles without errors, all type tests pass!
// ============================================================================

export const TYPE_TESTS_PASSED = true;
