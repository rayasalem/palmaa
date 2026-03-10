/**
 * E2E: Global navigation & clickable elements scan.
 *
 * يغطي:
 * - تحميل الصفحات الرئيسية (landing, catalog, login, cart, profile, dashboard).
 * - التأكد أن الأزرار والروابط قابلة للنقر بدون كسر الصفحة (مع تجنّب الأزرار الخطِرة مثل حذف/تعليق).
 * - التحقق من التنقل الأساسي بين الصفحات باستخدام أزرار/روابط الواجهة.
 */

import { NavigationPage, AuthPage, CatalogPage, CartPage, ProfilePage } from '../page-objects';

describe('Global navigation & buttons', () => {
  const routesForGuest = ['/', 'catalog', 'login'];

  routesForGuest.forEach((route) => {
    it(`guest: page loads and buttons clickable at #/${route || ''}`, () => {
      cy.visitHash(route);
      cy.get('body').should('be.visible');

      // Scan all clickable elements and attempt safe clicks.
      NavigationPage.getAllClickable().then(($els) => {
        cy.log(`Found ${$els.length} clickable elements on route ${route}`);
        if ($els.length === 0) return;

        Cypress.$($els)
          .toArray()
          .slice(0, 40) // safety cap: first 40 elements to keep test time reasonable
          .forEach((el) => {
            NavigationPage.clickSafely(Cypress.$(el));
            cy.get('body').should('be.visible');
          });
      });
    });
  });

  describe('Logged-in customer navigation', () => {
    beforeEach(() => {
      cy.login();
    });

    it('can navigate between dashboard, cart and profile via layout', () => {
      // Dashboard is default after login
      cy.url().should('include', '#/dashboard');

      // Go to cart
      CartPage.getCartTab().should('exist').click();
      cy.url().should('include', '#/cart');

      // Go to profile
      ProfilePage.getProfileTab().should('exist').click();
      cy.url().should('include', '#/profile');

      // Back to dashboard via any dashboard-like button in layout
      cy.contains('button, a', /لوحة التحكم|Dashboard|לוח בקרה/)
        .first()
        .click({ force: true });
      cy.url().should('match', /#\/(dashboard|home)/);
    });

    it('logged-in: buttons on dashboard/cart/profile are clickable (non-destructive)', () => {
      const hashes = ['dashboard', 'cart', 'profile'];
      hashes.forEach((h) => {
        cy.visitHash(h);
        cy.get('body').should('be.visible');
        NavigationPage.getAllClickable().then(($els) => {
          Cypress.$($els)
            .toArray()
            .slice(0, 40)
            .forEach((el) => {
              NavigationPage.clickSafely(Cypress.$(el));
              cy.get('body').should('be.visible');
            });
        });
      });
    });
  });

  describe('Admin navigation (if admin credentials available)', () => {
    it('admin: dashboard loads and main tabs are clickable', () => {
      cy.loginAsAdmin();
      cy.url().should('include', '#/dashboard');
      NavigationPage.getAllClickable().then(($els) => {
        Cypress.$($els)
          .toArray()
          .slice(0, 40)
          .forEach((el) => {
            NavigationPage.clickSafely(Cypress.$(el));
            cy.get('body').should('be.visible');
          });
      });
    });
  });
});
