# Midnight.js

Midnight.js is a Typescript-based application development framework for the 
Midnight blockchain. Analogous to [Web3.js](https://web3js.org/) for Ethereum, or
[polkadot.js](https://polkadot.js.org/) for Polkadot, it contains utilities for:

- Creating and submitting transactions
- Interacting with wallets
- Querying for block and state information
- Subscribing to chain events

Due to the privacy-preservation properties of the Midnight system, Midnight.js also 
contains a number of utilities that are unique to it:

- Executing smart contracts locally
- Incorporating private state into contract execution
- Persisting, querying, and updating private state
- Creating and verifying zero-knowledge proofs

## Package structure

This is a yarn [workspaces](https://yarnpkg.com/features/workspaces/) project. All packages live in the [`packages`](packages) directory:

- `types` - Contains types and interfaces common to all other packages.
- `contracts` - Contains utilities for interacting with Midnight smart contracts.
- `indexer-public-data-provider` - Contains a cross-environment implementation of a Midnight indexer client.
- `node-zk-config-provider` - Contains a file system based Node.js utility for retrieving zero-knowledge artifacts.
- `fetch-zk-config-provider` - Contains a [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) based cross-environment utility for retrieving zero-knowledge artifacts.
- `network-id` - Contains utilities for setting the network id used by `ledger`, `zswap`, and `compact-runtime` dependencies.
- `http-client-proof-provider` - Contains a cross-environment implementation of a proof-server client.
- `level-private-state-provider` - Contains a cross-environment implementation of a persistent private state store based on [Level](https://github.com/Level/level).
- `utils` - General utilities used in Midnight.js

## Development setup

### 1. Nvm

To start developing, first install [nvm](https://https://github.com/nvm-sh/nvm). Then [direnv](https://direnv.net) is
optional but strongly recommended.

### 2. Internal private registry and credentials

Configure Yarn by following the [Authentication setup document](https://input-output.atlassian.net/wiki/spaces/MN/pages/3696001685/Authentication+setup).

### 3. Developing

After configuring the credentials you are all set up to start developing.

If you're using `direnv`, only the first time you will need to do:
```shell
direnv allow
```
After that, `yarn` should be available in your path.

### Build

Remember to install the dependencies after cloning:
```shell
yarn install
```

Build:
```shell
yarn build
```

### Format code

```sh
yarn lint:fix 
```

### Tests

The following command runs the tests and generates code coverage report, which is available within `coverage` directory.
```sh
yarn test
```

## Contributing

All new features must branch off the default branch `main`.

It's recommended to enable automatic `eslint` formatting in your text editor
upon save, in order to avoid CI errors due to incorrect format.

## Release a new version

Please read our [git workflow](https://input-output.atlassian.net/wiki/spaces/MN/pages/3378086090/Git+Workflow)
for how to branch and tag releases.

In order to release a new version, the versions inside all `package.json` files
should be bumped. You can do this by:
```
yarn workspaces foreach --all version $VERSION
```

After that, use the [Releases](https://github.com/input-output-hk/midnight-js/releases/new) feature
from GitHub to create a tag with a name following the pattern `vX.Y.Z`.

### LICENSE

Apache 2.0.

### README.md

Provides a brief description for users and developers who want to understand the purpose, setup, and usage of the repository.

### SECURITY.md

Provides a brief description of the Midnight Foundation's security policy and how to properly disclose security issues.

### CONTRIBUTING.md

Provides guidelines for how people can contribute to the Midnight project.

### CODEOWNERS

Defines repository ownership rules.

### ISSUE_TEMPLATE

Provides templates for reporting various types of issues, such as: bug report, documentation improvement and feature request.

### PULL_REQUEST_TEMPLATE

Provides a template for a pull request.

### CLA Assistant

The Midnight Foundation appreciates contributions, and like many other open source projects asks contributors to sign a contributor
License Agreement before accepting contributions. We use CLA assistant (https://github.com/cla-assistant/cla-assistant) to streamline the CLA
signing process, enabling contributors to sign our CLAs directly within a GitHub pull request.

### Dependabot

The Midnight Foundation uses GitHub Dependabot feature to keep our projects dependencies up-to-date and address potential security vulnerabilities. 

### Checkmarx

The Midnight Foundation uses Checkmarx for application security (AppSec) to identify and fix security vulnerabilities.
All repositories are scanned with Checkmarx's suite of tools including: Static Application Security Testing (SAST), Infrastructure as Code (IaC), Software Composition Analysis (SCA), API Security, Container Security and Supply Chain Scans (SCS).

### Unito

Facilitates two-way data synchronization, automated workflows and streamline processes between: Jira, GitHub issues and Github project Kanban board. 

# TODO - New Repo Owner

### Software Package Data Exchange (SPDX)
Include the following Software Package Data Exchange (SPDX) short-form identifier in a comment at the top headers of each source code file.


 <I>// This file is part of <B>MIDNIGHT-JS</B>.<BR>
 // Copyright (C) 2025 Midnight Foundation<BR>
 // SPDX-License-Identifier: Apache-2.0<BR>
 // Licensed under the Apache License, Version 2.0 (the "License");<BR>
 // You may not use this file except in compliance with the License.<BR>
 // You may obtain a copy of the License at<BR>
 //<BR>
 //	http://www.apache.org/licenses/LICENSE-2.0<BR>
 //<BR>
 // Unless required by applicable law or agreed to in writing, software<BR>
 // distributed under the License is distributed on an "AS IS" BASIS,<BR>
 // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.<BR>
 // See the License for the specific language governing permissions and<BR>
 // limitations under the License.</I>
