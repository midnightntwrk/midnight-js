# Logger Provider

Configurable [pino](https://getpino.io/) logger wrapper for Midnight.js diagnostics and debugging.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-logger-provider
```

## Quick Start

```typescript
import pino from 'pino';
import { LoggerProvider } from '@midnight-ntwrk/midnight-js-logger-provider';

const logger = new LoggerProvider(pino({ level: 'debug' }));

logger.debug('External API call', { endpoint: '/api/data' });
logger.trace('Internal diagnostic', { state: 'processing' });
```

## Log Levels

Midnight.js uses the following log levels:

| Level   | Usage                        |
| ------- | ---------------------------- |
| `trace` | Internal diagnostics         |
| `debug` | External API calls           |
| `info`  | General information          |
| `warn`  | Warning conditions           |
| `error` | Error conditions             |
| `fatal` | Critical failures            |

## API

### LoggerProvider

```typescript
class LoggerProvider {
  constructor(logger: Logger);

  info(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
  isLevelEnabled(level: LogLevel): boolean;
}
```

## Usage with Midnight Providers

```typescript
import pino from 'pino';
import { LoggerProvider } from '@midnight-ntwrk/midnight-js-logger-provider';

const loggerProvider = new LoggerProvider(
  pino({
    level: 'trace',
    transport: {
      target: 'pino-pretty'
    }
  })
);

// Use with Midnight providers
const providers = {
  loggerProvider,
  // ... other providers
};
```

## Exports

```typescript
import { LoggerProvider } from '@midnight-ntwrk/midnight-js-logger-provider';
```

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)
- [Pino Logger](https://getpino.io/)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).
