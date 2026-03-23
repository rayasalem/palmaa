/**
 * Mediator marketing showcase — structured data for catalog / shop sections.
 * Matches `data/mediatorMarketingMock.json`.
 */
export interface MediatorMarketingItem {
  productName: string;
  price: number;
  currency?: string;
  imageURL: string;
  /** Max ~10 words */
  tagline: string;
  badgeText: string;
  badgeTextEn?: string;
  category: string;
  /** Hash path without leading #/ e.g. product/demo-prod-xxx */
  productLink: string;
}
