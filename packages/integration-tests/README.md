# Integration Tests for Midnight.js TypeScript Library

## Overview

This README provides information on the integration tests developed for a 
Midnight.js TypeScript library serving as an API for Midnight components. 
These tests interact with a Docker instances of the components running on localhost. 

## Approach

- Setup Docker Environment: Ensure that Docker is installed and running on your local machine. 
Pull the Docker image for the component if it's not already available locally. 
The process is automated using Testcontainers library.

- Library Configuration: Configure the TypeScript library to connect to the Docker 
instances of the component. 
Provide necessary environment variables or configuration files for seamless integration.

- Prepare Test Data: Develop Compact contract

- Write Integration Tests: Develop integration tests using Jest testing framework. 

- Test Execution: Run the integration tests against the Dockerized component. 
Monitor the test results to ensure proper interaction and functionality.

- Teardown: After testing, gracefully stop and remove the Docker container to avoid
resource wastage. The process is automated using Testcontainers library.

## Limitations

Dependency on Docker: Integration tests rely on the availability and proper 
functioning of the Dockerized component. 
Any issues with the Docker environment can hinder test execution.
All docker components are located in **Docker Compose** file: `compose.yml`

## Future Directions

Test Coverage: Enhance test coverage to encompass a wider range of scenarios 
and edge cases for comprehensive validation.

## Requirements

- Docker 
- Environment variables
  - **GITHUB_TOKEN** - for Compactc download and installation 
  - **COMPACT_HOME** - if there is a need for using the already installed Compactc version

## Test execution

Workflow:
1. `./compact-manager.sh` downloads the Compact compiler if it's not preconfigured
2. Compile the contract code with `compactc` installed script `run_compactc.sh`
3. Compile source code 
4. Copy all artifacts into `dist`
5. Run tests
6. Produce test reports

To run the process execute:

```shell
yarn build
yarn test
```

## Test Environment

By default, tests execute against local test environment started with Test Containers from [docker compose](./compose.yml).
Test environment can be changed by defining MN_TEST_ENVIRONMENT variable.

### Example

Example for test execution on *devnet*: 
```shell
export MN_TEST_ENVIRONMENT=devnet;yarn test
```

## Issues

- If anything is broken, execute 
```shell
yarn clean
``` 
