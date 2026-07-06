# E2E Test Commands

Use this reference to choose the Playwright command that matches the target environment and snapshot task.

## Running E2E Tests

Run:

```bash
npm run test:e2e
```

**Guidelines:**

- MUST use `npm run test:e2e` for the default local end-to-end verification run.

## Updating Test Snapshots

Run Playwright directly with the snapshot-update flag (`npm run test:e2e` is a compound script, so appended npm args would reach the scenario-coverage script instead):

```bash
npx playwright test --update-snapshots
```

**Guidelines:**

- MUST update snapshots only when the visual output change is intentional.
- SHOULD pair snapshot updates with the reason the expected output changed.

## Test Against Local Production Build

Run:

```bash
npm run build && npm run start
```

And then run the tests in another terminal session, pointing them at the running server (otherwise Playwright boots its own dev server):

```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

**Guidelines:**

- SHOULD use the local production build flow when verifying production-only behavior after `npm run build`.
- MUST keep the production server running while the e2e command executes in the second terminal session.

## Test Against a Deployed Environment

Set the `E2E_BASE_URL` env var to target a deployed environment instead of the local app:

```bash
E2E_BASE_URL=https://example.com npm run test:e2e
```

**Guidelines:**

- SHOULD set the base-URL env var only when intentionally testing a deployed environment instead of the local app.
