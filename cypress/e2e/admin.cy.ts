/**
 * E2E: Admin panel – users, products, orders (ADMIN role only).
 */
import { AdminPage } from '../page-objects';

describe('Admin Panel', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('admin area is accessible and shows nav', () => {
    AdminPage.visit();
    AdminPage.expectAdminPanelVisible();
  });

  it('users section exists', () => {
    AdminPage.visit();
    AdminPage.getUsersTab().should('exist').click();
    cy.get('body').should('be.visible');
  });

  it('orders tab exists', () => {
    AdminPage.visit();
    AdminPage.getOrdersTab().should('exist');
  });
});
