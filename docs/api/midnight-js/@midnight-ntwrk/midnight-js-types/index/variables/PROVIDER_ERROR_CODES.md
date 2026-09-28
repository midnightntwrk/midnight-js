[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PROVIDER\_ERROR\_CODES

# Variable: PROVIDER\_ERROR\_CODES

> `const` **PROVIDER\_ERROR\_CODES**: `Readonly`\<\{ `ERA_UNRESOLVABLE`: `"MIDNIGHT_JS_PR_ERA_UNRESOLVABLE"`; `ERA_UNSUPPORTED`: `"MIDNIGHT_JS_PR_ERA_UNSUPPORTED"`; `PRIVATE_STATE_NOT_SERIALIZABLE`: `"MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE"`; `SEAM_ERA_UNSUPPORTED`: `"MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED"`; `UNTAGGED_PAYLOAD`: `"MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD"`; `V8_PAYLOAD_UNSUPPORTED`: `"MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED"`; \}\>

Stable error-code strings for the providers.

Most of the group belongs to the provider seams. `PRIVATE_STATE_NOT_SERIALIZABLE`
does not: it belongs to the private-state provider, and is here because this is
the one provider-scoped group there is.

Declared in this package because this is where the payload union the seam codes
refuse is defined, and where the classes for three of them live; two others
come from
`@midnight-ntwrk/midnight-js-indexer-public-data-provider`, which depends on
this package. `@midnight-ntwrk/midnight-js-utils` re-exports the group and
folds it into the registry `hasErrorCode` consults.
