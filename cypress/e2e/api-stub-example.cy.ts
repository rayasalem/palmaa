/**
 * Example: E2E with API stubbing (login only).
 * Use when you want to test UI without hitting real auth API.
 */
import { AuthPage } from '../page-objects';

describe('Login with stubbed API', () => {
  it('shows success and redirects when API returns success', () => {
    cy.stubLogin({ success: true });
    AuthPage.visitLogin();
    AuthPage.getEmailInput().type('stub@test.com');
    AuthPage.getPasswordInput().type('stub-pass');
    AuthPage.getLoginForm().submit();
    cy.wait('@loginRequest');
    AuthPage.expectRedirectedAwayFromLogin();
  });

  it('shows error when API returns 401', () => {
    cy.stubLogin({ success: false, statusCode: 401 });
    AuthPage.visitLogin();
    AuthPage.getEmailInput().type('any@test.com');
    AuthPage.getPasswordInput().type('any');
    AuthPage.getLoginForm().submit();
    cy.wait('@loginRequest');
    AuthPage.getError().should('be.visible');
  });
});
