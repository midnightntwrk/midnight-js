# What is this?
An implementation of a private state provider that works with LevelDB compatible data stores.

This package provides **encrypted storage** for private states and signing keys using AES-256-GCM encryption.

This package was created for the [Midnight network](https://midnight.network).

Please visit the [Midnight Developer Hub](https://midnight.network/developer-hub) to learn more.

## Security

### Encryption at Rest

**All data is encrypted by default** using AES-256-GCM with PBKDF2 key derivation.

The encryption password **MUST** be configured via the `MIDNIGHT_STORAGE_PASSWORD` environment variable.

### ⚠️ CRITICAL: Password is REQUIRED

**The `MIDNIGHT_STORAGE_PASSWORD` environment variable is mandatory.**

Without this environment variable set, the application **will not start**.

**Minimum Requirements:**
- Minimum 16 characters
- Use cryptographically secure random password
- Never commit passwords to version control
- Rotate passwords periodically

### Password Setup

**Development:**
```bash
# Generate a secure random password
export MIDNIGHT_STORAGE_PASSWORD="$(openssl rand -base64 24)"
```

**Production (Environment Variable):**
```bash
# Use a strong, unique password
export MIDNIGHT_STORAGE_PASSWORD="$(openssl rand -base64 32)"
```

**Production (Secrets Manager):**
Use AWS Secrets Manager, HashiCorp Vault, or similar systems:
```typescript
import { getSecret } from './your-secrets-manager';

process.env.MIDNIGHT_STORAGE_PASSWORD = await getSecret('midnight-storage-password');
```

**Docker/Kubernetes:**
```yaml
# docker-compose.yml
environment:
  - MIDNIGHT_STORAGE_PASSWORD=${MIDNIGHT_STORAGE_PASSWORD}

# kubernetes secret
apiVersion: v1
kind: Secret
metadata:
  name: midnight-storage
type: Opaque
data:
  password: <base64-encoded-password>
```

### Security Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **PBKDF2**: 100,000 iterations with random salt per database
- **Mandatory Password**: No default password, environment variable required
- **Password Validation**: Minimum 16 character length enforced
- **Automatic Migration**: Existing unencrypted data is automatically encrypted on first access
- **Authentication**: Built-in protection against tampering (GCM mode)

### Data Protection

This provider encrypts:
- ✅ Private contract states
- ✅ Signing keys
- ✅ All sensitive user data

### Migration from Unencrypted Storage

If you have existing unencrypted data:
1. Set `MIDNIGHT_STORAGE_PASSWORD` environment variable
2. Start your application
3. Unencrypted data will be automatically encrypted on first read
4. All new writes are encrypted immediately

**No data loss occurs during migration.**

### Error Handling

If the environment variable is not set, you will see:
```
Error: MIDNIGHT_STORAGE_PASSWORD environment variable is required.
Please set it to a strong, unique password:
  export MIDNIGHT_STORAGE_PASSWORD="your-secure-password-here"

For production environments, use a cryptographically secure password:
  export MIDNIGHT_STORAGE_PASSWORD="$(openssl rand -base64 32)"
```

If the password is too short (< 16 characters):
```
Error: MIDNIGHT_STORAGE_PASSWORD must be at least 16 characters long.
Use a strong, randomly generated password for production.
```

# Use only in Midnight test environments
Image exclusively for Midnight test environments use.  

# Agree to Terms
By downloading and using this image, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf), which includes the [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

# License
The software provided herein is licensed under the [Apache License V2.0](http://www.apache.org/licenses/LICENSE-2.0).
