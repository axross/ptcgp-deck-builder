// Vitest replacement for the `server-only` package (see vitest.config.ts):
// the real module throws outside a React Server environment, which would
// break unit tests for server-tier modules like the card catalog.
export {};
