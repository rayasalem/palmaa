# Cypress E2E – Palma Marketplace

End-to-end tests for the live/production app using **Cypress** and **TypeScript**.

## Setup

```bash
npm install
```

Set the live app URL (optional; default is in `cypress.config.ts`):

- **Linux/macOS:** `export CYPRESS_BASE_URL=https://your-frontend.vercel.app`
- **Windows:** `set CYPRESS_BASE_URL=https://your-frontend.vercel.app`
- Or create `cypress.env.json` (gitignored) with `{ "CYPRESS_BASE_URL": "https://..." }`

Test user credentials (optional; defaults for demo accounts):

- `CYPRESS_TEST_USER_EMAIL` / `CYPRESS_TEST_USER_PASSWORD` (customer)
- `CYPRESS_TEST_ADMIN_EMAIL` / `CYPRESS_TEST_ADMIN_PASSWORD` (admin)

## Run

- **Interactive:** `npm run cy:open`
- **Headless:** `npm run cy:run`
- **Against specific URL:** `CYPRESS_BASE_URL=https://palma.ps npm run cy:run`

## Structure

- `cypress/e2e/` – specs by feature: `auth.cy.ts`, `catalog.cy.ts`, `cart.cy.ts`, `checkout.cy.ts`, `profile.cy.ts`, `admin.cy.ts`
- `cypress/page-objects/` – Page Object Model (AuthPage, CatalogPage, CartPage, CheckoutPage, ProfilePage, AdminPage)
- `cypress/support/commands.ts` – custom commands: `cy.login()`, `cy.loginAsAdmin()`, `cy.visitHash()`, `cy.stubLogin()`, `cy.stubGetMe()`
- `cypress/fixtures/` – optional mock data (e.g. `users.json`)

## Notes

- Tests run against the **live** app by default; use stubs only when needed (e.g. `cy.stubLogin()` in a spec).
- Hash routing: app uses `#/login`, `#/catalog`, `#/cart`, etc.
- Selectors use production DOM (IDs like `#login-email`, `#login-password`; no `data-cy` in app code).
