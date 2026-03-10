/**
 * E2E: Profile – view and update profile (logged-in).
 */
import { ProfilePage } from '../page-objects';

describe('Profile', () => {
  beforeEach(() => {
    cy.login();
  });

  it('profile tab is visible and navigates to profile', () => {
    ProfilePage.getProfileTab().should('exist').click();
    ProfilePage.expectProfileVisible();
  });

  it('profile page loads without error', () => {
    ProfilePage.visit();
    cy.url().should('include', '#/profile');
    cy.get('body').should('be.visible');
  });
});
