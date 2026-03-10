/**
 * Page Object: Global navigation & generic back buttons.
 * يعمل مع الراوتر المعتمد على الـ hash (#/...).
 */
export const NavigationPage = {
  /** Landing page (public marketing site) */
  visitLanding: () => cy.visit('/#/'),

  /** Public catalog */
  visitCatalog: () => cy.visit('/#/catalog'),

  /** Login page */
  visitLogin: () => cy.visit('/#/login'),

  /** Cart page (requires login for full experience) */
  visitCart: () => cy.visit('/#/cart'),

  /** Dashboard for logged-in users (merchant / broker / admin) */
  visitDashboard: () => cy.visit('/#/dashboard'),

  /** Profile page (logged-in) */
  visitProfile: () => cy.visit('/#/profile'),

  /** Generic helper to get all clickable controls on current page. */
  getAllClickable: () => cy.get('button, a[href], [role="button"], input[type="submit"], input[type="button"]'),

  /**
   * Back-style buttons: Arabic/English/Hebrew variants.
   * Examples: العودة، رجوع، Back, Go Back, Back to shop, Back to Edit.
   */
  getBackButtons: () => cy.contains('button', /العودة|رجوع|Back to shop|Back to Edit|Go Back|Back/),

  /** Click the first safe button (skipping destructive labels like Delete/حذف) */
  clickSafely: ($el: JQuery<HTMLElement>) => {
    const text = ($el.text() || '').toLowerCase();
    const dangerous =
      text.includes('delete') ||
      text.includes('حذف') ||
      text.includes('remove') ||
      text.includes('إزالة') ||
      text.includes('cancel order') ||
      text.includes('إلغاء الطلب') ||
      text.includes('suspend') ||
      text.includes('تعليق') ||
      text.includes('reject') ||
      text.includes('رفض');
    if (dangerous) {
      return;
    }
    cy.wrap($el).scrollIntoView().click({ force: true });
  },
};
