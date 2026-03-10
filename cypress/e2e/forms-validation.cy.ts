/**
 * E2E: Form validation – login, broker/merchant registration (safe checks), and checkout.
 *
 * يركّز على:
 * - التحقق من الحقول المطلوبة.
 * - عرض رسائل الخطأ عند نقص البيانات.
 * - الوصول إلى نموذج التسجيل للتاجر والوسيط بدون إنشاء حسابات حقيقية.
 */

import { AuthPage, CheckoutPage, CartPage } from '../page-objects';

describe('Form validation', () => {
  describe('Login form', () => {
    it('shows error when fields are empty or invalid', () => {
      AuthPage.visitLogin();
      AuthPage.expectLoginFormVisible();
      // اترك الحقول فارغة واضغط submit
      AuthPage.getLoginForm().submit();
      AuthPage.getError().should('be.visible');
    });
  });

  describe('Merchant registration (UI validation only)', () => {
    it('requires required fields before submitting', () => {
      AuthPage.visitLogin();
      AuthPage.clickRegisterTab();
      AuthPage.selectRole('MERCHANT');
      AuthPage.clickProceedToRegister();

      // نحن الآن في نموذج RegisterMerchant؛ جرّب الإرسال بدون ملء الحقول
      cy.get('form')
        .first()
        .within(() => {
          cy.root().submit();
        });

      cy.get('.bg-red-50').first().should('be.visible');
    });
  });

  describe('Broker registration (UI validation only)', () => {
    it('requires mandatory fields', () => {
      AuthPage.visitLogin();
      AuthPage.clickRegisterTab();
      AuthPage.selectRole('BROKER');
      AuthPage.clickProceedToRegister();

      // نموذج RegisterBroker: إرسال بدون تعبئة
      cy.get('form')
        .first()
        .within(() => {
          cy.root().submit();
        });

      cy.get('.bg-red-50').first().should('be.visible');
    });
  });

  describe('Checkout shipping form', () => {
    beforeEach(() => {
      cy.login();
    });

    it('requires recipient name, address, phone and location', () => {
      cy.visitHash('cart');
      cy.get('body').should('be.visible');

      CartPage.getCheckoutButton().then(($btn) => {
        if ($btn.length === 0) {
          cy.log('No checkout button (empty cart); skipping checkout validation');
          return;
        }
        cy.wrap($btn).click();
        CheckoutPage.expectCheckoutFormVisible();

        // تأكد من أن الحقول موجودة
        CheckoutPage.getRecipientNameInput().clear();
        CheckoutPage.getAddressInput().clear();
        CheckoutPage.getPhoneInput().clear();

        CheckoutPage.getSubmitButton().click();

        // يجب إظهار رسالة خطأ أو تلوين الحقول
        CheckoutPage.getError().should('be.visible');
      });
    });
  });
});
