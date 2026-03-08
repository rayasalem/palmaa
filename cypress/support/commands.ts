/**
 * Reusable Cypress commands for Palma Marketplace E2E tests.
 * Use these to log in, stub API when needed, and standardize setup.
 */

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Log in with email and password. Visits login page, fills form, submits.
       * Uses env TEST_USER_EMAIL / TEST_USER_PASSWORD if no args.
       */
      login(email?: string, password?: string): Chainable<void>;

      /**
       * Log in as admin. Uses env TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD if no args.
       */
      loginAsAdmin(email?: string, password?: string): Chainable<void>;

      /**
       * Log out via UI (click logout in user menu). Assumes user is logged in.
       */
      logout(): Chainable<void>;

      /**
       * Visit a hash route (e.g. 'login', 'catalog', 'cart'). Prepends #/
       */
      visitHash(route: string): Chainable<void>;

      /**
       * Stub POST /api/auth/login to force success or failure (for isolated UI tests).
       */
      stubLogin(options: { success?: boolean; statusCode?: number; body?: object }): Chainable<void>;

      /**
       * Stub GET /api/auth/me to return a user (for session restore tests).
       */
      stubGetMe(user: object): Chainable<void>;
    }
  }
}

const getLoginCredentials = (email?: string, password?: string) => ({
  email: email ?? Cypress.env('TEST_USER_EMAIL') ?? 'customer@palma.demo',
  password: password ?? Cypress.env('TEST_USER_PASSWORD') ?? 'Customer@123456',
});

const getAdminCredentials = (email?: string, password?: string) => ({
  email: email ?? Cypress.env('TEST_ADMIN_EMAIL') ?? 'info@palma.ps',
  password: password ?? Cypress.env('TEST_ADMIN_PASSWORD') ?? 'Admin@123456',
});

Cypress.Commands.add('login', (email?: string, password?: string) => {
  const { email: e, password: p } = getLoginCredentials(email, password);
  cy.visitHash('login');
  cy.get('#login-email').should('be.visible').clear().type(e);
  cy.get('#login-password').clear().type(p);
  cy.get('form').submit();
  // Wait for redirect away from login (hash or dashboard)
  cy.url().should('not.include', '#/login');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('loginAsAdmin', (email?: string, password?: string) => {
  const { email: e, password: p } = getAdminCredentials(email, password);
  cy.visitHash('login');
  cy.get('#login-email').should('be.visible').clear().type(e);
  cy.get('#login-password').clear().type(p);
  cy.get('form').submit();
  cy.url().should('not.include', '#/login');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('logout', () => {
  // Open user menu (desktop: click on avatar/menu; adjust selector to match Layout)
  cy.get('header').within(() => {
    cy.get('button').contains(/تسجيل الخروج|Log out|התנתק/).first().click({ force: true });
  }).then(() => {
    // If dropdown: click logout item
    cy.get('body').then(($body) => {
      const logoutBtn = $body.find('button:contains("تسجيل الخروج"), button:contains("Log out"), [role="menuitem"]');
      if (logoutBtn.length) logoutBtn.first().click();
    });
  });
  cy.url().should('match', /#\/$|#\/login|#\/catalog/);
});

Cypress.Commands.add('visitHash', (route: string) => {
  const path = route.replace(/^#?\/?/, '');
  cy.visit(`/#/${path}`, { failOnStatusCode: false });
});

Cypress.Commands.add('stubLogin', (options: { success?: boolean; statusCode?: number; body?: object }) => {
  const { success = true, statusCode = 200, body } = options;
  const apiBase = Cypress.config('baseUrl').replace(/\/$/, '');
  cy.intercept('POST', '**/api/auth/login', {
    statusCode,
    body: body ?? (success
      ? { success: true, user: { id: 'stub-user', email: 'stub@test.com', name: 'Stub User', role: 'CUSTOMER', status: 'ACTIVE' }, token: 'stub-token' }
      : { success: false, error: 'Invalid credentials' }),
  }).as('loginRequest');
});

Cypress.Commands.add('stubGetMe', (user: object) => {
  const apiBase = Cypress.config('baseUrl').replace(/\/$/, '');
  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: { success: true, user },
  }).as('getMe');
});

export {};
