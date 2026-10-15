# Sorcerer documentation

Start at [the project documentation index](./index.md) for an overview of the
rules archive, board data, and Color Value Chart.

## Running tests

Run `npm test` to execute the unit and browser regression tests. Install the
Playwright Chromium browser once with `npx playwright install chromium`.

To run only the browser tests, use `npm run test:e2e`. Playwright starts the Vite
development server automatically and saves failure screenshots and traces under
`test-results/`.
