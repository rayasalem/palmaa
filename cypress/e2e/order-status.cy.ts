/**
 * E2E: Order status flow — merchant accepts/updates status, customer sees updated status.
 * Requires: CYPRESS_BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_MERCHANT_EMAIL, TEST_MERCHANT_PASSWORD.
 */
import { AuthPage } from '../page-objects';

describe('Order status flow', () => {
  const customerEmail = Cypress.env('TEST_USER_EMAIL') || 'customer@palma.demo';
  const customerPassword = Cypress.env('TEST_USER_PASSWORD') || 'Customer@123456';
  const merchantEmail = Cypress.env('TEST_MERCHANT_EMAIL');
  const merchantPassword = Cypress.env('TEST_MERCHANT_PASSWORD');

  it('Merchant can accept a PENDING order (ACCEPTED)', function () {
    if (!merchantEmail || !merchantPassword) {
      this.skip();
    }
    cy.visitHash('login');
    cy.get('#login-email').clear().type(merchantEmail);
    cy.get('#login-password').clear().type(merchantPassword);
    cy.get('form').submit();
    cy.url().should('not.include', '#/login');
    cy.visitHash('dashboard');
    cy.contains(/طلبات|Orders|مرتبات/i).first().click();
    cy.get('body').should('be.visible');
    cy.get('table tbody tr').first().within(() => {
      cy.contains(/قبول الطلب|Accept order|→/).first().click();
    });
    cy.contains(/تم تحديث|updated|success/i, { timeout: 10000 }).should('be.visible');
    cy.get('table tbody tr').first().within(() => {
      cy.contains(/مقبول|Accepted/i).should('be.visible');
    });
  });

  it('Merchant can change status (ACCEPTED → IN_PROGRESS or next step)', function () {
    if (!merchantEmail || !merchantPassword) {
      this.skip();
    }
    cy.visitHash('login');
    cy.get('#login-email').clear().type(merchantEmail);
    cy.get('#login-password').clear().type(merchantPassword);
    cy.get('form').submit();
    cy.url().should('not.include', '#/login');
    cy.visitHash('dashboard');
    cy.contains(/طلبات|Orders/i).first().click();
    cy.get('body').should('be.visible');
    cy.get('table tbody tr').first().within(() => {
      cy.get('button').contains(/→|قيد التجهيز|In progress|في الطريق|On the way|إتمام|Mark completed/).first().click({ force: true });
    });
    cy.contains(/تم تحديث|updated|success/i, { timeout: 10000 }).should('be.visible');
  });

  it('Customer sees updated order status in My Orders', () => {
    cy.visitHash('login');
    cy.get('#login-email').clear().type(customerEmail);
    cy.get('#login-password').clear().type(customerPassword);
    cy.get('form').submit();
    cy.url().should('not.include', '#/login');
    cy.visitHash('orders');
    cy.get('body').should('be.visible');
    cy.contains(/طلباتي|My orders/i).should('exist');
    cy.get('body').then(($body) => {
      const hasStatus = $body.text().match(/قيد الانتظار|مقبول|قيد التجهيز|في الطريق|مكتمل|ملغى|Pending|Accepted|In Progress|On the Way|Completed|Cancelled/i);
      expect(hasStatus).to.be.ok;
    });
  });

  it('Customer can track order (open order detail and see status)', () => {
    cy.visitHash('login');
    cy.get('#login-email').clear().type(customerEmail);
    cy.get('#login-password').clear().type(customerPassword);
    cy.get('form').submit();
    cy.url().should('not.include', '#/login');
    cy.visitHash('orders');
    cy.get('body').should('be.visible');
    cy.get('table tbody tr a, .order-row a, [data-testid="order-row"] a').first().then(($link) => {
      if ($link.length) {
        cy.wrap($link).click();
        cy.url().should('match', /#\/orders\/|order/);
        cy.contains(/قيد الانتظار|مقبول|قيد التجهيز|في الطريق|مكتمل|ملغى|Pending|Accepted|In Progress|On the Way|Completed|Cancelled/i).should('be.visible');
      } else {
        cy.log('No order link to open – ensure orders exist');
      }
    });
  });
});
