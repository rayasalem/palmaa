/**
 * Page Object: Checkout (payment + shipment form).
 * Shown after user clicks checkout from cart; form posts to Cybersource Hosted.
 */
export const CheckoutPage = {
  /** Back button (returns to cart/shop) */
  getBackButton: () => cy.contains('button', /العودة|Back|חזור/).first(),

  /** Order total display */
  getOrderTotal: () =>
    cy
      .contains(/إجمالي|Order total|סה״כ/)
      .parent()
      .find('p, span')
      .first(),

  /** Recipient / full name */
  getRecipientNameInput: () => cy.get('input[name="recipient_name"]'),
  getAddressInput: () =>
    cy.get('input[name="addressLine1"], input[placeholder*="address"], input[placeholder*="عنوان"]').first(),
  getPhoneInput: () => cy.get('input[name="phone"], input[type="tel"]').first(),
  getCitySelect: () => cy.get('select[name="cityId"], [name="cityId"]').first(),

  /** Submit button (proceeds to payment gateway) */
  getSubmitButton: () => cy.contains('button', /متابعة|Submit|Pay|دفع|תשלום/).first(),

  /** Inline error */
  getError: () => cy.get('.bg-red-50, .text-red-600').first(),

  expectCheckoutFormVisible: () => {
    CheckoutPage.getRecipientNameInput().should('be.visible');
    CheckoutPage.getSubmitButton().should('exist');
  },
  expectErrorVisible: (message?: string) => {
    CheckoutPage.getError().should('be.visible');
    if (message) CheckoutPage.getError().should('contain.text', message);
  },
};
