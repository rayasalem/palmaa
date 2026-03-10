/**
 * Page Object: Public catalog and product listing.
 */
export const CatalogPage = {
  visit: () => cy.visit('/#/catalog'),
  visitLanding: () => cy.visit('/#/'),
  getHero: () => cy.get('#hero'),
  getProductLinks: () => cy.get('a[href*="#/product/"]'),
  clickFirstProduct: () => CatalogPage.getProductLinks().first().click(),
  goToCatalog: () => cy.visit('/#/catalog'),
  expectCatalogLoaded: () => {
    cy.url().should('include', '#/catalog');
    cy.get('body').should('be.visible');
  },
  expectProductCountAtLeast: (min: number) => {
    CatalogPage.getProductLinks().should('have.length.at.least', min);
  },
};
