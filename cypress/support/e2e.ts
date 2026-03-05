/**
 * Cypress E2E support – runs before every spec.
 * Import commands and set global defaults; do not run tests here.
 */
import './commands';

// Preserve session/localStorage between tests when needed (e.g. login once per spec)
Cypress.on('window:before:load', (win) => {
  // Ensure hash is available for SPA routing
  if (!win.location.hash && win.location.pathname === '/') {
    win.location.hash = '#/';
  }
});

beforeEach(() => {
  // Clear cookies between specs by default so each spec starts fresh unless using cy.login()
  // To keep session, use a single spec or cy.login() in before() and preserve cookies
  const preserveCookie = (Cypress as any).env('preserveSession');
  if (!preserveCookie) {
    cy.clearCookies();
  }
});
