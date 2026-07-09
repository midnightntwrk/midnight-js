# E2E Testing Strategy & Guidelines

End-to-End testing strategy for Midnight.JS applications, covering complete blockchain workflows and system interactions.

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Environment Configuration](#environment-configuration)
4. [Writing E2E Tests](#writing-e2e-tests)
5. [Test Execution](#test-execution)
6. [Debugging](#debugging)

---

## Overview

### What We Test

E2E tests validate complete user workflows across the blockchain stack:

- **Smart Contract Lifecycles**: Deployment, circuit execution, state management
- **Component Integration**: Wallet ↔ Node ↔ Indexer ↔ Proof Server interactions  
- **Network Operations**: Real blockchain network interactions
- **Error Scenarios**: Invalid inputs, network failures, edge cases

### Core Principles

1. **Test Real Scenarios**: Focus on actual user workflows
2. **Environment Isolation**: Clean state per test
3. **Clear Documentation**: Self-documenting tests with Given-When-Then

---

## Test Architecture

### Components

```
Test Environment Manager
├── Local (Docker Compose)
├── Remote (Devnet/Testnet) 
└── Custom (Environment Variables)

Infrastructure Components
├── Wallet Management
├── Proof Server Container
├── Node/Indexer/Faucet Clients
└── Contract Testing Framework
```

### Test Categories

#### 1. **Contract Tests**
- Contract deployment and validation
- Circuit execution
- State consistency (private and public)
- Transaction lifecycle

#### 2. **Infrastructure Tests** 
- Proof server integration
- Component communication
- Network reliability
- State synchronization

#### 3. **Error Handling Tests**
- Invalid input validation
- Network failure recovery
- Timeout scenarios
- Edge case handling

---

## Environment Configuration

> **Two independent axes.** Don't conflate them:
> - `MN_TEST_ENVIRONMENT` — **where** tests run (`undeployed` local stack, or a live network: `qanet` / `preview` / `preprod` / `env-var-remote`).
> - `TESTKIT_DOCKER_ENV` — **which docker image versions** the local stack uses (`qanet` / `preview` / `preprod` / `mainnet` / `devnet`). The image-version sets `mainnet` and `devnet` exist only as version bundles; the test framework does not run against live mainnet or devnet.

### Environment Types

| Environment | Use Case | Infrastructure | Limitations |
|-------------|----------|----------------|-------------|
| `undeployed` (default) | Development | Local Docker Compose stack | 4 wallets max |
| `qanet` | Integration | Live QA network | Network dependent |
| `preview` | Integration | Live preview network | Network dependent |
| `preprod` | Integration | Live preprod network | Network dependent |
| `env-var-remote` | Custom | User-defined endpoints | Requires `MN_TEST_INDEXER` / `MN_TEST_NODE` / `MN_TEST_FAUCET` |

### Environment Variables

```bash
# Primary Configuration
MN_TEST_ENVIRONMENT=undeployed|qanet|preview|preprod|env-var-remote
MN_TEST_WALLET_SEED="optional-seed-phrase"

# Custom Environment (when env-var-remote)
MN_TEST_NETWORK_ID="custom-network-id"
MN_TEST_INDEXER="http://custom-indexer:3085/api/"
MN_TEST_INDEXER_WS="ws://custom-indexer:3085/ws/"
MN_TEST_NODE="http://custom-node:3086"
MN_TEST_FAUCET="http://custom-faucet:3087"
```

### Docker image versions

`compose.yml` and `proof-server.yml` resolve their image tags from env vars sourced from `testkit-js/env/<TESTKIT_DOCKER_ENV>.env`:

```bash
TESTKIT_DOCKER_ENV     # qanet|preview|preprod|mainnet|devnet (default: devnet)
PROOF_SERVER_VERSION   # proof-server image tag
INDEXER_VERSION        # indexer-standalone image tag
MIDNIGHT_NODE_VERSION  # midnight-node image tag
```

With direnv these are exported automatically. To switch envs: `TESTKIT_DOCKER_ENV=qanet direnv reload`. See [DEVELOPMENT.md](../../DEVELOPMENT.md#testkit-environment-selection) for details.

### Usage Examples

```bash
# Local development
yarn e2e

# Live network integration (preview / preprod / qanet)
MN_TEST_ENVIRONMENT=preview yarn e2e

# Custom environment
MN_TEST_ENVIRONMENT=env-var-remote \
MN_TEST_INDEXER="http://localhost:3085/api/" \
yarn e2e
```

---

## Writing E2E Tests

### Test Template

```typescript
import { createLogger, getTestEnvironment, initializeMidnightProviders } from '@midnight-ntwrk/testkit-js';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `feature_${new Date().toISOString()}.log`)
);

describe('Feature Name', () => {
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let providers: YourProviders;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, configuration);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  /**
   * Test documentation with Given-When-Then structure
   *
   * @given Initial system state and preconditions
   * @when Action or operation being tested
   * @then Expected outcome and validation criteria
   */
  it('should perform expected behavior [@slow]', async () => {
    // Arrange
    const initialState = await getInitialState();
    
    // Act
    const result = await performOperation();
    
    // Assert
    expect(result).toBeDefined();
    await expectSuccessfulOperation(result);
  });
});
```

### Best Practices

#### Test Documentation
```typescript
/**
 * @given Deployed contract with initial state
 * @when Executing increment circuit
 * @then Should update both ledger and private state
 */
it('should execute increment circuit [@slow]', async () => {
  // Implementation
});
```

#### Error Testing
```typescript
await expect(invalidOperation()).rejects.toThrow('Expected error message');
```

#### State Validation
```typescript
const stateBefore = await getContractState();
await performOperation();
const stateAfter = await getContractState();
expect(stateAfter.value).toEqual(stateBefore.value + 1);
```

#### Annotations
- `[@slow]` - Tests > 30 seconds, uses extended timeout
- Gherkin comments - Clear test intent documentation

---

## Test Execution

### Commands

```bash
yarn e2e              # Run all E2E tests locally
yarn e2e-debug        # Run with debug output  
yarn e2e-testnet      # Run against testnet
yarn e2e-single       # Run single test file (requires MN_TEST_FILE environment variable)
```

### Configuration

#### Timeouts
```typescript
// config/vitest.e2e.config.ts
testTimeout: 60_000     // 1 minute default
hookTimeout: 2 * 60_000  // 2 minutes for setup/teardown

// For slow tests
const SLOW_TEST_TIMEOUT = 5 * 60_000; // 5 minutes
it('long operation [@slow]', async () => {}, SLOW_TEST_TIMEOUT);
```

#### Parallel Execution
Tests run safely in parallel with:
- Isolated test environments
- Unique resource naming (`counter-private-store-${Date.now()}`)
- Proper cleanup in afterAll hooks

### Reports

Generated reports:
- **JUnit XML**: `./reports/test-report.xml` (CI/CD integration)
- **HTML**: `./reports/html/index.html` (interactive results)
- **CTRF JSON**: `./reports/ctrf-report.json` (programmatic analysis)
- **Allure**: `./reports/allure-results/` (rich reporting with history)

---

## Debugging

### Logging

```typescript
// Test-specific logs
const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `feature_${new Date().toISOString()}.log`)
);

beforeEach(() => {
  logger.info(`Running test=${expect.getState().currentTestName}`);
});
```

### Debug Commands

```bash
# Enable container debugging
DEBUG='testcontainers:compose' yarn e2e
DEBUG='testcontainers:containers' yarn e2e-debug

# View logs
tail -f packages/testing/logs/tests/latest.log

# Check container status (requires PROOF_SERVER_VERSION / INDEXER_VERSION / MIDNIGHT_NODE_VERSION
# to be exported — direnv handles this; otherwise source the relevant env file first)
docker compose -f compose.yml ps
docker compose -f compose.yml logs proof-server
```

### Common Issues

#### Test Timeouts
```typescript
// Use appropriate timeouts for slow operations
it('should complete operation [@slow]', async () => {
  // Implementation
}, SLOW_TEST_TIMEOUT);
```

#### Environment Setup
```bash
# Ensure Docker is running and image-version env vars are set
# (direnv exports them from testkit-js/env/<TESTKIT_DOCKER_ENV>.env; otherwise source manually)
docker compose -f compose.yml pull
yarn e2e
```

#### State Synchronization
```typescript
// Wait for state synchronization
await waitForFullSync(wallet);
const state = await getContractState();
expect(state).toBeDefined();
```

---

## Quick Reference

### Essential Commands
```bash
yarn e2e                    # Local E2E tests
yarn e2e-testnet           # Testnet integration
yarn e2e-debug             # Debug output
```

### Key Environment Variables  
```bash
MN_TEST_ENVIRONMENT        # Optional network id: undeployed|qanet|preview|preprod|env-var-remote
MN_TEST_WALLET_SEED        # Optional wallet seed
```

### Test Annotations
- `[@slow]` - Extended timeout for long operations
- `@given/@when/@then` - Gherkin-style documentation
