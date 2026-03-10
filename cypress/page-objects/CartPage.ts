/**
 * Page Object: Cart (logged-in or guest cart).
 */
export const CartPage = {
  visit: () => cy.visit('/#/cart'),
  getCartTab: () => cy.contains('button', /سلة|Cart|עגלה/).first(),
  getCartItems: () => cy.get('table tbody tr'),
  getEmptyMessage: () => cy.contains(/سلة فارغة|empty|ריק|لا توجد/),
  getAddToCartButton: () => cy.contains('button', /أضف|Add to cart|הוסף/).first(),
  getCheckoutButton: () => cy.contains('button', /دفع|Checkout|תשלום|متابعة للدفع|Proceed/).first(),
  expectCartVisible: () => {
    cy.url().should('include', '#/cart');
    CartPage.getCartTab().should('exist');
  },
  expectCartEmpty: () => CartPage.getEmptyMessage().should('be.visible'),
  expectCartHasItems: (count?: number) => {
    if (count !== undefined) CartPage.getCartItems().should('have.length', count);
    else CartPage.getCartItems().should('have.length.at.least', 1);
  },
};
