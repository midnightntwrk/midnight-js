import { describe, expect, it } from 'vitest';

import { withContractScopedTransaction } from '../transaction';
import { createMockProviders } from './test-mocks';

describe('scoped transaction error messages', () => {
  it('should include scopeName in execution error message for root transactions', async () => {
    const mockProviders = createMockProviders();

    await expect(
      withContractScopedTransaction(
        mockProviders,
        async () => { throw new Error('circuit failed'); },
        { scopeName: 'myTransfer' }
      )
    ).rejects.toThrow(/myTransfer/);
  });

  it('should show <unnamed> when no scopeName is provided', async () => {
    const mockProviders = createMockProviders();

    await expect(
      withContractScopedTransaction(
        mockProviders,
        async () => { throw new Error('circuit failed'); }
      )
    ).rejects.toThrow(/<unnamed>/);
  });
});
