/**
 * Page Object: Admin panel (users, products, orders, withdrawals).
 * Only visible for users with role ADMIN.
 */
export const AdminPage = {
  visit: () => cy.visit('/#/admin'),

  /** Admin nav items */
  getUsersTab: () => cy.contains('button', /مستخدمين|Users|משתמשים/).first(),
  getProductsTab: () => cy.contains('button', /منتجات|Products|מוצרים/).first(),
  getOrdersTab: () => cy.contains('button', /طلبات|Orders|הזמנות/).first(),
  getWithdrawalsTab: () => cy.contains('button', /سحوبات|Withdrawals|משיכות/).first(),

  /** Users table or list */
  getUsersTable: () => cy.get('table'),
  getUsersRows: () => cy.get('table tbody tr'),

  /** Approve / Reject user (if present) */
  getApproveButton: () => cy.contains('button', /موافقة|Approve|אשר/).first(),
  getRejectButton: () => cy.contains('button', /رفض|Reject|דחה/).first(),

  /** Delete reason input (admin delete user) */
  getDeleteReasonInput: () => cy.get('#admin-delete-reason'),

  expectAdminPanelVisible: () => {
    cy.url().should('match', /#\/(admin|dashboard)/);
    AdminPage.getUsersTab().should('exist');
  },
};
