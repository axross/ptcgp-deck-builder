# E2E Test Structure

## Project Structure

This is a journey-centric app, so suites are organized by purpose/feature area rather than by route tree. Specs live directly under `e2e/` next to the scenario catalog; reusable helpers get their own directory as they appear.

```
e2e/
├── scenarios.md            # the scenario-coverage journey catalog
├── helpers/                # reusable test helpers (created with the first helper)
├── home.spec.ts            # feature-area suite
└── <area>.spec.ts          # one suite per feature area / journey group
```

**Guidelines:**

- MUST place e2e specs directly under `e2e/` as `<area>.spec.ts`, one suite per feature area or journey group.
- MUST keep reusable e2e helpers under `e2e/helpers/`.
- MUST register each new user journey in `e2e/scenarios.md` and tag its asserting test per [scenario-coverage.md](./scenario-coverage.md); the `@smoke` tag marks the fast boots-and-core-loop subset (`npx playwright test --grep @smoke`).
- MUST treat the smoke subset as the first gate: if it fails, deeper suites are not worth running.
- SHOULD guard each previously shipped bug with a named regression test instead of folding the check into an unrelated case.

## Test File Structure

File names are kebab-case with the project's test extension so the framework's test-file matcher picks them up without extra configuration.

**Guidelines:**

- MUST use kebab-case for file names.
- MUST use the `.spec.ts` extension for test files (Playwright's default matcher).

## Test Case Structure

One behavior per test keeps failures diagnosable, and named steps turn a multi-phase journey's report into a readable narrative. Steps earn their keep only when a test has phases to narrate — wrapping a single arrange → act → assert in one step adds noise, not structure.

**Guidelines:**

- MUST define one test case per behavior.
- MUST name test cases concisely.
- MUST wrap each meaningful action/assertion group of a multi-phase scenario (two or more distinct arrange/act/assert phases) in a step, using the framework's step API, at human-understandable granularity; steps can nest.
- MAY omit steps in a short atomic test (a single arrange → act → assert).
- MUST NOT pad an atomic test with a one-step wrapper just to satisfy step structure.
- MUST name test steps concisely.
