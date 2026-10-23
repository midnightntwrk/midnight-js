[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / MidnightJsErrorCategory

# Type Alias: MidnightJsErrorCategory

> **MidnightJsErrorCategory** = *typeof* [`MIDNIGHT_JS_ERROR_CATEGORIES`](../variables/MIDNIGHT_JS_ERROR_CATEGORIES.md)\[keyof *typeof* [`MIDNIGHT_JS_ERROR_CATEGORIES`](../variables/MIDNIGHT_JS_ERROR_CATEGORIES.md)\]

What the caller should do about an error: fix its own code (`USAGE`), fix the installation or
infrastructure (`ENVIRONMENT`), retry (`TRANSIENT`), handle a refusal by contract or network rules
(`REJECTED`), check on chain whether a submitted transaction landed before doing anything else
(`UNCERTAIN`), stop and alert on bad data (`INTEGRITY`), or report a midnight-js bug (`INTERNAL`).
