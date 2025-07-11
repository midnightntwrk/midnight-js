# Compact compiler manager for Midnight.js TypeScript Library

## Overview

This README provides information on the compact compiler manager for Midnight.js. 
The purpose of this package is to provide a single, easy-to-use, and lightweight 
package that fetches and compiles smart contracts written in Compact.

## Usage

### Install

```shell
yarn add -D @midnight-ntwrk/midnight-js-compact
yarn install
```

### Compile Compact contract 

**NOTE:** It can be executed even if you don't have compactc installed and set up.

```shell
yarn fetch-compactc
yarn run-compactc ./contract.compact ./contract-output
```
