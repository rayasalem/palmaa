/**
 * Page Object: Auth (Login, Register, Forgot Password, Email Verification).
 */
export const AuthPage = {
  visitLogin: () => cy.visit('/#/login'),
  visitRegister: () => cy.visit('/#/register'),
  visitVerifyEmail: () => cy.visit('/#/verify-email'),

  getEmailInput: () => cy.get('#login-email'),
  getPasswordInput: () => cy.get('#login-password'),
  getLoginSubmitButton: () =>
    cy
      .get('form')
      .contains('button', /Log in|تسجيل/)
      .first(),
  getLoginForm: () => cy.get('form').first(),

  getError: () => cy.get('.bg-red-50').first(),

  clickRegisterTab: () => cy.contains('button', /Register|تسجيل|הרשם/).click(),
  selectRole: (role: 'CUSTOMER' | 'MERCHANT' | 'BROKER') => {
    const labels: Record<string, string> = {
      CUSTOMER: 'Customer',
      MERCHANT: 'Merchant',
      BROKER: 'Broker',
    };
    return cy.contains('button', new RegExp(labels[role], 'i')).first().click();
  },
  clickProceedToRegister: () =>
    cy
      .contains('button', /Continue|متابعة|המשך/)
      .first()
      .click(),

  clickForgotPassword: () =>
    cy
      .contains('button', /Forgot|نسيت/)
      .first()
      .click(),
  getForgotEmailInput: () => cy.get('#forgot-email'),
  getVerificationCodeInput: () => cy.get('input[placeholder="000000"], input[maxLength="6"]').first(),
  getVerifySubmitButton: () => cy.contains('button', /Verify|تأكيد/).first(),

  expectLoginFormVisible: () => {
    AuthPage.getEmailInput().should('be.visible');
    AuthPage.getPasswordInput().should('be.visible');
  },
  expectErrorVisible: (message?: string) => {
    AuthPage.getError().should('be.visible');
    if (message) AuthPage.getError().should('contain.text', message);
  },
  expectRedirectedAwayFromLogin: () => cy.url().should('not.include', '#/login'),
};
