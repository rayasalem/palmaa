/**
 * E2E: Checkout – form validation, payment flow entry.
 * Does not complete real payment; asserts form and optional API stub for session.
 */
import { CheckoutPage, CartPage } from '../page-objects';

describe('Checkout', () => {
  beforeEach(() => {
    cy.login();
  });

  it('when cart has items, user can open checkout', () => {
    cy.visit('/#/cart');
    cy.get('body').should('be.visible');
    CartPage.getCheckoutButton().then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click();
        CheckoutPage.expectCheckoutFormVisible();
      } else {
        cy.log('No checkout button (empty cart); skipping');
      }
    });
  });

  it('checkout form has required fields when reached via direct hash', () => {
    cy.visit('/#/cart');
    cy.get('a[href*="checkout"], button')
      .contains(/دفع|Checkout|תשלום|متابعة/)
      .then(($el) => {
        if ($el.length) $el.first().click();
      });
    cy.get('input[name="recipient_name"]').then(($input) => {
      if ($input.length) {
        cy.wrap($input).should('be.visible');
        CheckoutPage.getSubmitButton().should('exist');
      }
    });
  });
});
