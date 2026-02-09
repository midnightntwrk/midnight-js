# Breaking Changes v3.1.0

## 1. Package Deprecation: midnight-js-level-private-state-provider (#487)

### Important Notice

`@midnight-ntwrk/midnight-js-level-private-state-provider` is now **deprecated** and marked as **NOT FOR COMMERCIAL USE**.

### Warning

**This package is provided as an example implementation only.**

It uses browser localStorage or Node.js file storage - **losing private state by clearing browser cache could be financially ruinous**.

### Impact

- The package will show deprecation warnings when installed
- The package should not be used in production or commercial applications
- The package remains available for development, testing, and educational purposes

### Reason

The current implementation stores private state in browser localStorage or Node.js file storage, which:
- Can be accidentally cleared by users
- Is not backed up automatically
- Could result in permanent loss of contract state and keys
- Could lead to financial losses if private state is lost

### Recommended Actions

1. **For development/testing:** You may continue using the package with awareness of its limitations
2. **For production:** Implement a custom `PrivateStateProvider` with proper persistent storage and backup mechanisms
3. **For commercial use:** Do not use this package - implement a production-grade solution

### Example Custom Implementation

```typescript
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

class ProductionPrivateStateProvider implements PrivateStateProvider {
  // Implement with proper database storage
  // Include backup mechanisms
  // Add encryption at rest
  // Ensure proper key management
}
```

---

## Common Migration Issues

### Issue: Deprecation Warning on Install

**Warning:**
```
npm WARN deprecated @midnight-ntwrk/midnight-js-level-private-state-provider:
This package is deprecated. It uses browser localStorage or Node.js file storage
which is not suitable for production use.
```

**Resolution:** This is expected. For development/testing, you can continue using the package. For production, implement a custom solution.

### Issue: Continued Use in Production

**Risk:** Using this package in production could result in:
- Loss of private state data
- Inability to interact with deployed contracts
- Financial losses

**Resolution:** Implement a production-grade `PrivateStateProvider` with:
- Persistent database storage (e.g., PostgreSQL, MongoDB)
- Automatic backups
- Encryption at rest
- Proper key management
