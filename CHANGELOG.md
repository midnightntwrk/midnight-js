# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.3] - Unreleased

### Added
- Upgrades MN.js to use Compact 0.25.0
- E2E test documentation and README

### Changed
- Updated GraphQL codegen version
- Updated Axios version to address security concerns
- Dependency updates via Dependabot for improved security

### Security
- Removed obsolete workflows and secured existing ones
- Updated workflow permissions for enhanced security
- Security patches through dependency updates

### Fixed
- Various dependency version alignments
- Workflow configuration improvements

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
