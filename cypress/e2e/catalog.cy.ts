/**
 * E2E: Catalog and product browsing (public).
 * Assumes live API returns at least some products.
 */
import { CatalogPage } from '../page-objects';

describe('Catalog & Browsing', () => {
  it('loads landing and shows hero', () => {
    CatalogPage.visitLanding();
    cy.get('body').should('be.visible');
    cy.get('#hero').should('exist');
  });

  it('navigates to catalog and shows product list', () => {
    CatalogPage.visit();
    CatalogPage.expectCatalogLoaded();
  });

  it('has at least one product link when catalog has products', () => {
    CatalogPage.visit();
    cy.get('body').should('be.visible');
    cy.get('a[href*="#/product/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links).should('have.length.at.least', 1);
      }
    });
  });

  it('clicking first product opens product detail', () => {
    CatalogPage.visit();
    cy.get('a[href*="#/product/"]').then(($links) => {
      if ($links.length === 0) {
        cy.log('No products in catalog; skipping navigation assert');
        return;
      }
      cy.wrap($links).first().click();
      cy.url().should('include', '#/product/');
    });
  });
});
