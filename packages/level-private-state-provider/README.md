# What is this?
An implementation of a private state provider that works with LevelDB compatible data stores.

This package provides **encrypted storage** for private states and signing keys using AES-256-GCM encryption.

This package was created for the [Midnight network](https://midnight.network).

Please visit the [Midnight Developer Hub](https://midnight.network/developer-hub) to learn more.

## Security

### Encryption at Rest

**All data is encrypted by default** using AES-256-GCM with PBKDF2 key derivation.

### Security Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **PBKDF2**: 100,000 iterations with random salt per database
- **Mandatory Password**: By default data is encrypted with wallets encryption key, developer can override this behavior 
- **Password Validation**: Minimum 16 character length enforced
- **Automatic Migration**: Existing unencrypted data is automatically encrypted on first access

### Data Protection

This provider encrypts:
- Private contract states
- Signing keys
- All sensitive user data

### Migration from Unencrypted Storage

If you have existing unencrypted data:
1. Start your application
2. Unencrypted data will be automatically encrypted on first read
3. All new writes are encrypted immediately

**No data loss occurs during migration.**

### Error Handling

If the password is too short (< 16 characters):
```
Error: Password must be at least 16 characters long.
Use a strong, randomly generated password for production.
```

# Agree to Terms
By downloading and using this image, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf), which includes the [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

# License
The software provided herein is licensed under the [Apache License V2.0](http://www.apache.org/licenses/LICENSE-2.0).
