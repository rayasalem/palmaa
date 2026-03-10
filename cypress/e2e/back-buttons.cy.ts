/**
 * E2E: Back buttons – verify they return to the expected view/hash.
 *
 * يغطي:
 * - Public product details → العودة للكتالوج.
 * - Public profile → العودة للصفحة الرئيسية.
 * - Public broker page → العودة للصفحة الرئيسية.
 * - صفحة الشروط والأحكام للتاجر → رجوع للرئيسية.
 * - Checkout (الرجوع للسلة).
 * - صفحة العودة من الدفع CheckoutReturnPage (إزالة معلمات orderId/payment).
 */

import { NavigationPage, CatalogPage, CartPage, CheckoutPage } from '../page-objects';

describe('Back buttons', () => {
  it('Public product details: back returns to catalog when opened from catalog', () => {
    CatalogPage.visit();
    CatalogPage.expectCatalogLoaded();

    // حاول فتح أول منتج إن وجد
    CatalogPage.getProductLinks().then(($links) => {
      if ($links.length === 0) {
        cy.log('No products found in catalog; skipping product back-button assert');
        return;
      }
      cy.wrap($links).first().click();
      cy.url().should('include', '#/product/');

      // زر الرجوع إلى المنتجات
      cy.contains('button', /المنتجات|Products/)
        .first()
        .click();
      cy.url().should('include', '#/catalog');
    });
  });

  it('Public profile view: back returns to landing', () => {
    // إذا كان هناك رابط profile عام، استخدمه، وإلا استخدم بارامتر profile عند الإمكان
    cy.visit('/#/'); // landing
    cy.get('body').should('be.visible');

    // نحاول إيجاد أي رابط إلى #/profile/...
    cy.get('a[href*="#/profile/"]').then(($links) => {
      if ($links.length === 0) {
        cy.log('No public profile links found; skipping assert');
        return;
      }
      cy.wrap($links).first().click();
      cy.url().should('include', '#/profile/');

      cy.contains('button', /العودة|رجوع|Back|Go Back/)
        .first()
        .click();
      cy.url().should('match', /#\/$/);
    });
  });

  it('Public broker page: Go Home button returns to landing', () => {
    // نحاول زيارة broker عبر أي رابط متوفر
    cy.visit('/#/'); // landing
    cy.get('body').should('be.visible');

    cy.get('a[href*="#/broker/"], a[href*="broker="]').then(($links) => {
      if ($links.length === 0) {
        cy.log('No broker links found; skipping broker back-button assert');
        return;
      }
      cy.wrap($links).first().click();
      cy.url().should('include', '#/broker');

      cy.contains('button', /Go Home|الرئيسية|Home/)
        .first()
        .click();
      cy.url().should('match', /#\/$/);
    });
  });

  it('Merchant terms view: Back returns to landing', () => {
    cy.visit('/#/terms');
    cy.get('body').should('be.visible');

    cy.contains('button', /رجوع|Back/)
      .first()
      .click();
    cy.url().should('match', /#\/$/);
  });

  it('Checkout page: Back returns to cart', () => {
    cy.login();
    cy.visitHash('cart');
    cy.get('body').should('be.visible');

    // افتح صفحة الدفع (checkout) إن كانت متاحة
    CartPage.getCheckoutButton().then(($btn) => {
      if ($btn.length === 0) {
        cy.log('No checkout button (cart empty); skipping checkout back-button assert');
        return;
      }
      cy.wrap($btn).click();
      CheckoutPage.expectCheckoutFormVisible();

      CheckoutPage.getBackButton().click();
      cy.url().should('include', '#/cart');
    });
  });

  it('CheckoutReturnPage: back hides return view and clears search params', () => {
    // نزور الصفحة مع orderId/payment في querystring حتى يظهر CheckoutReturnPage
    cy.visit('/?orderId=test-order-123&payment=success#/');
    cy.get('body').should('be.visible');

    // نتأكد أن هناك نص متعلق بالدفعة
    cy.contains(/الدفع|Payment/).should('exist');

    // زر العودة/العودة للتسوق
    cy.contains('button', /العودة للتسوق|Back to shop|العودة|Back/)
      .first()
      .click();

    // الآن يجب أن تختفي معلمات البحث، وتعود الواجهة الرئيسية/الطلبات
    cy.location().should((loc) => {
      expect(loc.search).to.eq('');
    });
  });
});
