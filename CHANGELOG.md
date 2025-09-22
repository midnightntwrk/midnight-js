# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0-rc.1] - 2025-08-29]

### Added
- **Block Time Access**: Fix for `toLedgerState`, which erased the `block`
- 
## [2.1.0-rc.1] - 2025-08-29

### Added
- **Block Time Access**: Added `secondsSinceLastEpoch` value to `QueryContext` in Compact programs to retrieve current block time within contracts
- **E2E Test Documentation**: Comprehensive README for end-to-end testing setup and usage
- **Enhanced Testing Framework**: New block time API tests and improved contract testing capabilities
- **Import Sorting**: ESLint configuration now includes automatic import sorting for better code organization

### Changed
- **Compact Compiler**: Upgraded to Compact version 0.25.0 with improved contract compilation
- **Dependencies**: Major updates including:
  - GraphQL codegen and related packages
  - Axios version updates for security
  - Apollo Client to v3.13.9
  - Node.js type definitions to v22.0.2
  - ESLint and Prettier configurations
  - Vitest and testing utilities
- **Development Workflow**: Enhanced CI/CD with better test reporting and security scanning
- **Code Quality**: Improved TypeScript configurations and contract type definitions
- **Husky Configuration**: Changed from pre-commit to pre-push hooks for better developer experience

### Security
- **Workflow Hardening**: Removed obsolete workflows and updated GitHub Actions permissions
- **Dependency Security**: Applied security patches through comprehensive dependency updates
- **GitHub Actions**: Updated to latest secure versions including:
  - docker/login-action to 3.5.0
  - actions/setup-node to 4.4.0
  - actions/download-artifact to 5.0.0
  - checkmarx/ast-github-action to 2.3.24

### Fixed
- **Configuration Issues**: Resolved Docker port conflicts and logger-provider path issues
- **Type Definitions**: Cleaned up contract types and improved test mocks
- **Workflow Permissions**: Updated GitHub Actions with proper security permissions
- **Dependencies**: Aligned versions across packages and resolved version conflicts
- **Documentation**: Fixed API documentation generation and TypeDoc configuration

### Developer Experience
- **Automated Dependency Management**: Enabled Dependabot and Renovate for automated updates
- **Better Test Reporting**: Integrated CTRF reporting for improved test feedback
- **Linting Improvements**: Enhanced ESLint rules with import sorting and unused import detection
- **CI/CD Optimization**: Faster feedback with optimized workflow configurations

## [2.0.2] - 2025-06-11

### Summary
- Add captcha header for faucet request
- Ensure segment number defaults to 0

## [2.0.1] - 2025-05-30

### Summary
- Consider EncPublicKey as Bech32m formatted strings
- Update zSwap-utils createUnprovenOutput to use segment 0

## [2.0.0] - 2025-05-12

### Summary
- Update typedoc.json
- Fix the broken compact package
- Fix the docs workflow
- Fix API docs
- Fix the docs workflow (again)
- Update dependency cross-fetch to v4.1.0
- Update dependency node to v22.14.0
- Pin dependencies
- Update dependency graphql to v16.10.0
- Update devDependencies (non-major)
- Update dependency @rollup/plugin-node-resolve to v16
- Update dependency @apollo/client to v3.13.6
- Update dependency graphql-ws to v6
- Update dependency express to v5
- API documentation update
- Update dependency node to v22.15.0
- Add BLS support
- Rename contract to contractAction in GraphQL schema
- Release 2.0.0-rc.1
- Update yarn to v4.9.1
- Bump @apollo/client to v3.13.8 and force import of only CJS modules
- Release 2.0.0-rc.2
- Add single test for Node.js compatibility
- Prepare release 2.0.0

## [1.0.0] - 2025-04-02

### Summary
- Introduces proper semantic versioning.
- Bech32m is now default and works with older wallets.
- Test framework is now public.
- Custom logging strategies are now supported.
- Works with the latest Node.js LTS.
- Dependencies updated to fix vulnerabilities.
