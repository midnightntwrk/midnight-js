# Midnight.js Threat Model

## 1. Introduction

### Purpose
This document defines the security boundaries, trust assumptions, and threat landscape for applications built with Midnight.js.

### Scope
- **In Scope**: Client-side security, data handling, cryptographic operations, provider implementations, network interactions
- **Out of Scope**: Midnight blockchain consensus security, smart contract logic vulnerabilities, operating system security

### Target Audience
Application developers using Midnight.js to build privacy-preserving decentralized applications.

## 2. System Architecture

### Components
```
┌─────────────┐
│ Application │
└──────┬──────┘
       │
┌──────▼────────────────────────────────────┐
│         Midnight.js Framework             │
│  ┌────────────────────────────────────┐   │
│  │ Contract Execution & Tx Builder    │   │
│  └────────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │
│  │ Provider Interfaces                │   │
│  │  • PrivateStateProvider            │   │
│  │  • ProofProvider                   │   │
│  │  • PublicDataProvider              │   │
│  │  • WalletProvider                  │   │
│  │  • ZKConfigProvider                │   │
│  └────────────────────────────────────┘   │
└───────────┬───────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼────┐      ┌───▼─────────┐
│ Local  │      │   External  │
│ Device │      │   Services  │
└────────┘      └─────────────┘
```

### Trust Boundaries
- **Trusted**: User's device, local storage (encrypted)
- **Semi-Trusted**: Wallet provider, DApp connector
- **Untrusted**: Midnight nodes, indexer, proof server, ZK artifact repositories

## 3. Assets & Threats

### Critical Assets
| Asset | Storage Location | Encryption | Threat Level |
|-------|-----------------|------------|--------------|
| Private State | LevelDB (local) | AES-256-GCM | High |
| Signing Keys | LevelDB (local) | AES-256-GCM | Critical |
| Wallet Credentials | Wallet Provider | Provider-dependent | Critical |
| ZK Proofs | Memory (transient) | None | Medium |
| Transaction Data | Memory/Network | Blockchain encryption | Medium |

### Threat Categories
1. **Local Attacks**: Physical device access, malware, memory dumps
2. **Network Attacks**: MitM, DNS poisoning, malicious nodes
3. **Cryptographic Attacks**: Side-channels, weak randomness, key extraction
4. **Supply Chain**: Compromised dependencies, malicious providers
5. **Application-Level**: XSS, CSRF, improper secret handling

## 4. Component-Specific Threat Analysis

### 4.1 Private State Provider

**Default Implementation**: `LevelPrivateStateProvider`

**Assets Protected**:
- Contract private states
- Signing keys (contract-specific)

**Security Features**:
- AES-256-GCM encryption at rest
- PBKDF2 key derivation (100k iterations)
- Unique IV per encryption operation
- Authenticated encryption (prevents tampering)
- Backward compatibility (auto-migrates unencrypted data)

**Threats & Mitigations**:

| Threat | Impact | Mitigation | Residual Risk |
|--------|--------|------------|---------------|
| Unencrypted storage access | Critical | Storage encryption enabled by default | Depends on password strength |
| Password compromise | Critical | Requires `MIDNIGHT_STORAGE_PASSWORD` env var (min 16 chars) | User responsibility |
| Memory dump attacks | High | None (data decrypted in memory during use) | Inherent limitation |
| Database file theft | Critical | Encrypted storage | Password-dependent |
| Malware/keylogger | Critical | None | OS/AV responsibility |

**Implementation Requirements**:
```typescript
// Required: Set strong password via environment variable
process.env.MIDNIGHT_STORAGE_PASSWORD = "cryptographically-secure-password";

// Recommended: Use system keychain/credential manager
const password = await getFromSecureKeychain('midnight-storage');
```

**Custom Provider Requirements**:
- MUST encrypt private states at rest
- MUST use authenticated encryption (e.g., AES-GCM, ChaCha20-Poly1305)
- MUST protect signing keys with same or higher security as private states
- SHOULD use key derivation (PBKDF2, Argon2, scrypt)
- SHOULD securely wipe keys from memory when possible

### 4.2 Proof Provider

**Default Implementation**: `HttpClientProofProvider`

**Function**: Delegates ZK proof generation to remote proof server

**Threats & Mitigations**:

| Threat | Impact | Mitigation | Residual Risk |
|--------|--------|------------|---------------|
| Malicious proof server | High | Proofs are verified on-chain | Server learns transaction patterns |
| Network interception | Medium | Use HTTPS, verify TLS certificates | None if TLS properly configured |
| Proof server unavailability | Medium | Implement retry logic, fallback servers | Service dependency |
| Side-channel leakage | Medium | None | Proof server can infer transaction metadata |

**Privacy Considerations**:
- Proof server sees unproven transactions (metadata visible)
- Does NOT see private state or signing keys
- Can correlate requests to infer user behavior
- Consider running self-hosted proof server for sensitive applications

**Custom Provider Requirements**:
- MUST validate proof correctness (framework validates on-chain)
- MUST use TLS for network communication
- SHOULD implement request authentication
- SHOULD implement rate limiting- SHOULD log failures without exposing sensitive data

### 4.3 Public Data Provider

**Default Implementation**: `IndexerPublicDataProvider`

**Function**: Queries blockchain state via GraphQL indexer

**Threats & Mitigations**:

| Threat | Impact | Mitigation | Residual Risk |
|--------|--------|------------|---------------|
| Malicious/compromised indexer | High | Verify data against multiple sources, validate blockchain headers | Trust in indexer service |
| Eclipse attacks | High | Connect to multiple indexer endpoints | Service dependency |
| Data tampering | Medium | Cross-reference with on-chain data | Computational overhead |
| Privacy leakage | Low | Indexer sees query patterns | Metadata correlation possible |

**Custom Provider Requirements**:
- SHOULD validate returned data authenticity
- SHOULD implement query retry with exponential backoff
- SHOULD avoid logging sensitive query parameters

### 4.4 Wallet Provider

**Function**: Manages user funds, balances transactions, provides cryptographic keys

**Threats & Mitigations**:

| Threat | Impact | Mitigation | Residual Risk |
|--------|--------|------------|---------------|
| Wallet compromise | Critical | Use hardware wallets or secure enclaves | Wallet implementation dependent |
| Key extraction | Critical | Keys should never leave wallet boundary | Wallet provider responsibility |
| Transaction manipulation | High | User approves all transactions | UI spoofing possible |
| Unauthorized access | Critical | Multi-factor authentication, biometric locks | User responsibility |

**DApp Connector Security**:
- Uses isolated iframe or extension for wallet communication
- Application NEVER has direct access to wallet private keys
- User explicitly approves each transaction
- Wallet provider enforces origin checking

**Custom Provider Requirements**:
- MUST protect private keys with hardware security or secure enclave
- MUST implement user approval flow for all transactions
- MUST validate transaction parameters before signing
- SHOULD implement spending limits and anomaly detection
- SHOULD support transaction simulation before approval

### 4.5 ZK Config Provider

**Default Implementations**: `FetchZKConfigProvider`, `NodeZKConfigProvider`

**Function**: Retrieves proving keys, verifying keys, and ZKIR artifacts

**Threats & Mitigations**:

| Threat | Impact | Mitigation | Residual Risk |
|--------|--------|------------|---------------|
| Artifact tampering | Critical | Verify artifacts using checksums/signatures | Trust in artifact repository |
| Supply chain attack | Critical | Use official repositories, verify signatures | Initial trust assumption |
| Outdated artifacts | Medium | Implement version checking | None |
| Network MitM | Medium | Use HTTPS, certificate pinning | None if properly configured |

**Custom Provider Requirements**:
- MUST verify artifact integrity (checksum/signature)
- SHOULD cache artifacts securely
- SHOULD implement version compatibility checks

## 5. Attack Scenarios & Defenses

### 5.1 Local Device Compromise

**Scenario**: Attacker gains physical or remote access to user's device

**Attack Vectors**:
- Malware reading storage files
- Memory dumps extracting decrypted data
- Keyloggers capturing passwords
- Screen recording during sensitive operations

**Defenses**:
✅ Storage encryption (requires password)
✅ Minimize plaintext lifetime in memory
❌ Cannot prevent memory dumps while data is in use
❌ Cannot prevent keyloggers (OS responsibility)

**User Responsibilities**:
- Use strong, unique storage password
- Secure device with encryption, screen lock, antivirus
- Use hardware wallets for high-value operations
- Avoid running untrusted software

### 5.2 Network-Level Attacks

**Scenario**: Attacker intercepts or manipulates network traffic

**Attack Vectors**:
- MitM on HTTP connections
- DNS spoofing to malicious servers
- BGP hijacking
- Certificate mis-issuance

**Defenses**:
✅ All providers use HTTPS by default
✅ TLS certificate validation
✅ Support for certificate pinning
⚠️ Multi-node/multi-indexer verification recommended

**User Responsibilities**:
- Use trusted networks or VPN
- Verify TLS warnings
- Configure multiple provider endpoints

### 5.3 Malicious Service Providers

**Scenario**: Indexer, proof server, or artifact repository is compromised

**Attack Vectors**:
- False blockchain state from indexer
- Modified ZK artifacts
- Proof server correlation attacks
- Service unavailability (DoS)

**Defenses**:
✅ On-chain proof verification (invalid proofs rejected)
✅ Cross-reference multiple indexers
✅ Artifact integrity checking
⚠️ Privacy leakage to proof server (metadata visible)

**Mitigation Strategies**:
- Self-host proof server for sensitive applications
- Use multiple indexer endpoints
- Implement client-side validation of blockchain data
- Download and verify artifacts from official sources

### 5.4 Supply Chain Attacks
**Scenario**: Compromised npm packages or dependencies

**Attack Vectors**:
- Malicious code in Midnight.js dependencies
- Typosquatting attacks
- Compromised maintainer accounts
- Build-time injection

**Defenses**:
✅ Regular dependency audits (`yarn audit`)
✅ Lock file verification (`yarn.lock`)
✅ Conventional commits and code review process
✅ Automated security scanning in CI/CD

**User Responsibilities**:
- Verify package integrity (`npm audit`, `yarn audit`)
- Use dependency scanning tools (Snyk, Dependabot)
- Pin dependency versions in production
- Review dependency changes in updates

### 5.5 Side-Channel Attacks

**Scenario**: Attacker infers sensitive information through timing, power, or EM analysis

**Attack Vectors**:
- Timing attacks on cryptographic operations
- Cache timing attacks
- Power analysis (requires physical access)
- Spectre/Meltdown-style exploits

**Defenses**:
⚠️ Limited protection against sophisticated side-channels
✅ Use constant-time cryptographic libraries where possible
❌ Cannot prevent all side-channels (especially in JavaScript)

**Risk Assessment**: Low for typical web applications, higher for high-security deployments

## 6. Security Requirements for Implementers

### 6.1 Custom Provider Checklist

**PrivateStateProvider**:
- [ ] Implements encryption at rest (AES-256-GCM or equivalent)
- [ ] Uses authenticated encryption (prevents tampering)
- [ ] Implements secure key derivation (PBKDF2, Argon2, or scrypt)
- [ ] Protects signing keys with equal or greater security
- [ ] Securely wipes sensitive data from memory when possible
- [ ] Handles encryption failures gracefully
- [ ] Documents encryption scheme and key management

**ProofProvider**:
- [ ] Uses TLS for all network communications
- [ ] Validates TLS certificates
- [ ] Implements request authentication if self-hosted
- [ ] Implements rate limiting
- [ ] Logs errors without exposing transaction details
- [ ] Documents privacy implications (metadata leakage)

**PublicDataProvider**:
- [ ] Validates data authenticity where possible
- [ ] Implements query retry with exponential backoff
- [ ] Connects to multiple indexer endpoints for redundancy
- [ ] Avoids logging sensitive query parameters
- [ ] Implements request timeout handling

**WalletProvider**:
- [ ] Protects private keys with hardware security or secure enclave
- [ ] Implements user approval flow for all transactions
- [ ] Validates transaction parameters before signing
- [ ] Implements origin checking for DApp connections
- [ ] Supports transaction simulation
- [ ] Implements spending limits and anomaly detection
- [ ] Provides clear security warnings to users

**ZKConfigProvider**:
- [ ] Verifies artifact integrity (checksum or signature)
- [ ] Caches artifacts securely
- [ ] Implements version compatibility checking
- [ ] Uses HTTPS with certificate validation
- [ ] Documents artifact verification process

### 6.2 Application Developer Checklist

**Environment Setup**:
- [ ] Set `MIDNIGHT_STORAGE_PASSWORD` to cryptographically secure password (≥32 chars)
- [ ] Store password in system keychain or secrets manager (not in code)
- [ ] Use different passwords for dev/staging/production
- [ ] Document password rotation procedure

**Configuration**:
- [ ] Configure multiple indexer endpoints
- [ ] Use HTTPS for all provider connections
- [ ] Enable TLS certificate validation
- [ ] Configure appropriate request timeouts
- [ ] Implement circuit breakers for external services

**Operational Security**:
- [ ] Regular dependency updates and security audits
- [ ] Implement logging without exposing sensitive data
- [ ] Monitor for anomalous behavior
- [ ] Implement incident response procedures
- [ ] Regular security testing (penetration testing)
- [ ] User education on security best practices

**Deployment**:
- [ ] Use Content Security Policy (CSP) headers
- [ ] Implement Subresource Integrity (SRI) for CDN resources
- [ ] Enable HTTPS-only (HSTS)
- [ ] Regularly backup encrypted storage
- [ ] Test disaster recovery procedures

## 7. Known Limitations & Risks

### 7.1 Inherent Limitations

**Client-Side Security**:
- JavaScript runtime provides limited memory protection
- Browser/Node.js can be compromised at OS level
- Cannot fully prevent memory dumps while data is decrypted
- Limited protection against sophisticated side-channel attacks

**Network Privacy**:
- Proof server observes transaction patterns (metadata leakage)
- Indexer observes query patterns
- Network adversaries can observe traffic patterns
- Tor/VPN recommended for enhanced privacy but not provided by framework

**Trust Dependencies**:
- Initial trust in ZK artifact authenticity
- Trust in wallet provider implementation
- Dependence on external service availability
- Cannot eliminate all supply chain risks

### 7.2 Mitigations in Progress

- Enhanced memory protection techniques
- Zero-knowledge proof server protocols
- Decentralized indexer networks
- Hardware security module integration
- Formal verification of cryptographic implementations

## 8. Security Best Practices

### For Application Developers

**1. Secure Password Management**:
```bash
# Generate strong password
export MIDNIGHT_STORAGE_PASSWORD="$(openssl rand -base64 32)"

# Store in system keychain (macOS example)
security add-generic-password -a midnight -s midnight-storage -w "$MIDNIGHT_STORAGE_PASSWORD"

# Retrieve from keychain in application
const password = await getFromKeychain('midnight-storage');
```

**2. Defense in Depth**:- Use multiple indexer endpoints
- Implement client-side data validation
- Use hardware wallets for high-value transactions
- Regular security audits and penetration testing

**3. Sensitive Data Handling**:
```typescript
// ✅ Good: Minimize plaintext lifetime
const result = await processPrivateData(data);
clearSensitiveData(data);

// ❌ Bad: Long-lived sensitive data
const globalPrivateState = await getPrivateState();
```

**4. Error Handling**:
```typescript
// ✅ Good: Generic error messages
try {
  await submitTransaction(tx);
} catch (error) {
  logger.error('Transaction failed', { txId: tx.id });
  throw new Error('Transaction submission failed');
}

// ❌ Bad: Exposes sensitive details
catch (error) {
  throw new Error(`Failed for user ${userId}: ${privateState}`);
}
```

**5. Configuration Validation**:
```typescript
// Validate all provider configurations
function validateConfig(config: MidnightConfig): void {
  if (!config.storagePassword || config.storagePassword.length < 16) {
    throw new Error('Storage password must be ≥16 characters');
  }
  if (!config.indexerUrl.startsWith('https://')) {
    throw new Error('Indexer must use HTTPS');
  }
  // ... additional validations
}
```

### For End Users

**1. Device Security**:
- Use full disk encryption
- Enable screen lock with strong password/biometrics
- Keep OS and applications updated
- Use reputable antivirus software
- Avoid public/untrusted networks for sensitive operations

**2. Wallet Security**:
- Use hardware wallets for significant funds
- Enable multi-factor authentication
- Verify transaction details before approval
- Use separate wallets for different risk levels
- Regular wallet software updates

**3. Operational Security**:
- Verify application authenticity before installation
- Review permissions requested by applications
- Regular security audits of installed applications
- Backup encrypted data securely
- Use strong, unique passwords (password manager)

## 9. Incident Response

### Detection Indicators

**Compromise Indicators**:
- Unexpected database file modifications
- Unusual network traffic patterns
- Failed decryption attempts
- Unauthorized transaction submissions
- Wallet balance discrepancies
- Provider authentication failures

**Monitoring Recommendations**:
- Log all provider connection attempts
- Monitor database access patterns
- Alert on failed decryption attempts
- Track transaction submission failures
- Monitor for unusual gas usage patterns

### Response Procedures

**If Storage Compromise Suspected**:
1. Immediately stop application
2. Rotate storage encryption password
3. Audit all recent transactions
4. Re-encrypt all private states with new password
5. Investigate compromise source
6. Review and update security measures

**If Wallet Compromise Suspected**:
1. Immediately disconnect wallet
2. Transfer funds to new wallet (if possible)
3. Revoke all active sessions
4. Review transaction history for unauthorized activity
5. Generate new wallet with fresh keys
6. Update all application configurations

**If Network Compromise Suspected**:
1. Switch to trusted network/VPN
2. Verify TLS certificate of all providers
3. Cross-reference blockchain state with multiple sources
4. Review recent transactions for anomalies
5. Update provider endpoints if necessary

### Reporting Security Issues

Follow the [SECURITY.md](../SECURITY.md) process:
- Use GitHub's private vulnerability reporting
- Include detailed reproduction steps
- Provide proof-of-concept if available
- Response within 3 business days

## 10. Compliance Considerations

### Data Protection

**GDPR Considerations**:
- Private states contain potentially personal data
- Users have right to deletion (implement secure deletion)
- Storage encryption helps meet security requirements
- Document data retention policies

**Encryption Standards**:
- AES-256-GCM meets modern encryption standards
- PBKDF2 with 100k iterations meets NIST guidelines
- Consider Argon2 for even stronger key derivation

### Security Standards

**Applicable Standards**:
- OWASP Cryptographic Storage Cheat Sheet
- NIST Special Publication 800-175B (Key Management)
- ISO/IEC 27001 (Information Security Management)
- PCI DSS 4.0 (if handling payment data)

## 11. References

### Security Resources
- [Zcash Wallet App Threat Model](https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST Key Management Guidelines](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)

### Midnight.js Documentation
- [Architecture Overview](../README.md)
- [Security Policy](../SECURITY.md)
- [API Documentation](./README_API.md)

## 12. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-XX | Initial threat model with storage encryption |

---

**Document Maintenance**: This threat model should be reviewed quarterly and updated when:
- New features are added to Midnight.js
- Security vulnerabilities are discovered
- Attack techniques evolve
- External dependencies change significantly
- Compliance requirements change
