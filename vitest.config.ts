import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig's "@/*" → "src/*" path alias.
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside a React Server environment; stub it so
      // unit tests can exercise server-tier modules (e.g. the card catalog).
      "server-only": path.resolve(import.meta.dirname, "src/test-support/server-only-stub.ts"),
    },
  },
  test: {
    // Colocated unit tests: app/feature modules under src, plus the ingestion
    // pipeline's tests under scripts (the fetch tooling lives in scripts/).
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
  },
});
