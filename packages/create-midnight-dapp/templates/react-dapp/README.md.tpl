# {{projectName}}

A privacy-preserving dApp built with Midnight.

## Prerequisites

- Node.js >= 22
- Yarn or npm
- [Lace Wallet](https://www.lace.io/) with Midnight support

## Getting Started

```bash
# 1. Install dependencies
yarn install

# 2. Compile the smart contract (REQUIRED before building)
yarn compact

# 3. Start the development server
yarn dev
```

> **Important**: You MUST run `yarn compact` before `yarn build` or `yarn dev`.
> This compiles the Compact smart contract and generates the TypeScript types.

## Available Scripts

| Script | Description |
|--------|-------------|
| `yarn compact` | **Run first!** Compiles smart contracts |
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn preview` | Preview production build |
| `yarn lint` | Check for linting errors |
| `yarn format` | Format code with Prettier |

## Project Structure

```
{{projectName}}/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Entry point
│   ├── contract/
│   │   ├── contracts/       # Compact smart contract source
│   │   └── build/           # Generated after yarn compact
│   └── lib/
│       ├── providers.ts     # Midnight provider setup
│       └── wallet-adapter.ts # Wallet integration
└── vite.config.ts
```

## Learn More

- [Midnight Documentation](https://docs.midnight.network)
- [Midnight.js SDK](https://github.com/midnight-ntwrk/midnight-js)
