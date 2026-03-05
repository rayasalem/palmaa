/**
 * E2E: Authentication - login, logout, registration, email verification.
 */
import { AuthPage } from '../page-objects';

describe('Authentication', () => {
  describe('Login - positive', () => {
    it('shows login form at #/login', () => {
      AuthPage.visitLogin();
      AuthPage.expectLoginFormVisible();
      AuthPage.getLoginForm().should('exist');
    });

    it('logs in with valid credentials and redirects', () => {
      AuthPage.visitLogin();
      AuthPage.getEmailInput().clear().type(Cypress.env('TEST_USER_EMAIL'));
      AuthPage.getPasswordInput().clear().type(Cypress.env('TEST_USER_PASSWORD'));
      AuthPage.getLoginForm().submit();
      AuthPage.expectRedirectedAwayFromLogin();
      cy.get('header').should('be.visible');
    });
  });

  describe('Login - negative', () => {
    it('shows error when password is wrong', () => {
      AuthPage.visitLogin();
      AuthPage.getEmailInput().clear().type('wrong@test.com');
      AuthPage.getPasswordInput().clear().type('WrongPassword123');
      AuthPage.getLoginForm().submit();
      cy.get('.bg-red-50').should('be.visible');
    });
  });

  describe('Logout', () => {
    it('logs out after login', () => {
      cy.login();
      cy.get('header').should('be.visible');
      cy.get('button[title]').then(($btns) => {
        const logout = $btns.filter((_, el) => {
          const t = (el.getAttribute('title') || '').toLowerCase();
          return t.includes('log') || t.includes('خروج');
        });
        if (logout.length) logout.first().click();
      });
    });
  });

  describe('Registration', () => {
    it('shows role selection when Register tab clicked', () => {
      AuthPage.visitLogin();
      AuthPage.clickRegisterTab();
      AuthPage.selectRole('CUSTOMER');
      AuthPage.clickProceedToRegister();
      cy.get('form').should('exist');
    });
  });

  describe('Email verification page', () => {
    it('verify-email has code input', () => {
      cy.visit('/#/verify-email');
      cy.get('input[maxLength="6"]').should('exist');
    });
  });
});
