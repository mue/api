import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const images = sqliteTable('images', {
  blurHash: text('blur_hash'),
  camera: text('camera').default('landscapes'),
  category: text('category'),
  colour: text('colour').notNull().default('#000000'),
  createdAt: text('created_at'),
  id: text('id').primaryKey(),
  locationData: text('location_data'),
  locationName: text('location_name'),
  originalFileName: text('original_file_name'),
  photographer: text('photographer'),
  pun: integer('pun').notNull().unique(),
  version: integer('version').notNull().default(1668190000),
});

export const quotes = sqliteTable('quotes', {
  author: text('author'),
  authorOccupation: text('author_occupation'),
  id: text('id').primaryKey(),
  language: text('language'),
  quote: text('quote'),
});

export const oldQuotes = sqliteTable('old_quotes', {
  author: text('author'),
  authorOccupation: text('author_occupation'),
  id: text('id').primaryKey(),
  language: text('language'),
  quote: text('quote'),
});

export const marketplaceAnalytics = sqliteTable(
  'marketplace_analytics',
  {
    category: text('category').notNull(),
    downloads: integer('downloads').default(0),
    itemId: text('item_id').notNull(),
    updatedAt: text('updated_at'),
    views: integer('views').default(0),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.category] })],
);
