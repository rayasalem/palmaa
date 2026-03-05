/**
 * Page Object: User profile (update name, email, etc.).
 * Profile tab in Layout for logged-in users.
 */
export const ProfilePage = {
  visit: () => cy.visit('/#/profile'),

  /** Profile tab in nav/sidebar */
  getProfileTab: () => cy.contains('button', /الملف|Profile|פרופיל/).first(),

  /** Name / email display or edit fields */
  getNameField: () => cy.get('input[name="name"], input[placeholder*="name"], input[placeholder*="الاسم"]').first(),
  getEmailField: () => cy.get('input[name="email"], input[type="email"]').first(),

  /** Save / Update button */
  getSaveButton: () => cy.contains('button', /حفظ|Save|שמור|تحديث|Update/).first(),

  expectProfileVisible: () => {
    cy.url().should('include', '#/profile');
    cy.get('body').should('be.visible');
  },
};
