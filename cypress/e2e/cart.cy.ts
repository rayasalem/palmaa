/**
 * E2E: Cart – view cart, add to cart, checkout entry.
 * Requires logged-in customer for full flow; guest cart may be limited on live.
 */
import { CartPage, CatalogPage } from '../page-objects';

describe('Cart', () => {
  describe('As guest (no login)', () => {
    it('visiting #/cart may show login prompt or empty cart', () => {
      cy.visit('/#/cart');
      cy.get('body').should('be.visible');
      cy.url().should('include', '#/cart');
    });
  });

  describe('As logged-in customer', () => {
    beforeEach(() => {
      cy.login();
    });

    it('cart tab is visible and navigates to cart', () => {
      CartPage.getCartTab().should('exist').click();
      cy.url().should('include', '#/cart');
    });

    it('cart page shows content (empty state or items)', () => {
      CartPage.visit();
      CartPage.expectCartVisible();
      cy.get('body').should('be.visible');
    });
  });
});
