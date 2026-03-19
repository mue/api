import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const images = sqliteTable('images', {
	id: text('id').primaryKey(),
	camera: text('camera').default('landscapes'),
	createdAt: text('created_at'),
	locationData: text('location_data'),
	locationName: text('location_name'),
	photographer: text('photographer'),
	category: text('category'),
	originalFileName: text('original_file_name'),
	colour: text('colour').notNull().default('#000000'),
	pun: integer('pun').notNull().unique(),
	version: integer('version').notNull().default(1668190000),
	blurHash: text('blur_hash'),
});

export const quotes = sqliteTable('quotes', {
	id: text('id').primaryKey(),
	author: text('author'),
	authorOccupation: text('author_occupation'),
	language: text('language'),
	quote: text('quote'),
});

export const oldQuotes = sqliteTable('old_quotes', {
	id: text('id').primaryKey(),
	author: text('author'),
	quote: text('quote'),
	language: text('language'),
	authorOccupation: text('author_occupation'),
});

export const marketplaceAnalytics = sqliteTable('marketplace_analytics', {
	itemId: text('item_id').notNull(),
	category: text('category').notNull(),
	views: integer('views').default(0),
	downloads: integer('downloads').default(0),
	updatedAt: text('updated_at'),
}, (t) => [primaryKey({ columns: [t.itemId, t.category] })]);
