---
paths:
  - "**/*.test.ts"
  - "**/*.test-d.ts"
---

# Testing

## Test Structure

```typescript
// ✅ Use Arrange-Act-Assert pattern
describe('deployContract', () => {
  it('should deploy contract with initial state', async () => {
    // Arrange
    const providers = createMockProviders();
    const options = { compiledContract, privateStateId: 'test' };

    // Act
    const deployed = await deployContract(providers, options);

    // Assert
    expect(deployed.contractAddress).toBeDefined();
    expect(deployed.callTx).toBeDefined();
  });
});
```

## Test Categories

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test provider interactions
3. **E2E Tests** - Test full transaction flows against network

## Testing Guidelines

```typescript
// ✅ Test meaningful scenarios, not implementation details
it('should encrypt state with provided password', async () => { });
it('should reject weak passwords', async () => { });

// ❌ Don't test internal methods or trivial getters
it('should call internal helper', async () => { }); // BAD

// ✅ Test error cases through behavior
it('should throw when contract address is invalid', async () => {
  await expect(findContract(invalidAddress))
    .rejects.toThrow(ContractNotFoundError);
});

// ✅ Use descriptive test names
it('should return undefined when private state does not exist', async () => { });
```
