# Supabase → Cloudflare D1 + Drizzle Migration

**Date:** 2026-03-19
**Project:** mue-api
**Status:** In Review

## Overview

Migrate the Mue API off Supabase (PostgreSQL) onto Cloudflare D1 (SQLite) using Drizzle ORM as the query layer. The migration has four phases: export data, define schema, initialise the DB client, and rewrite all route handlers.

## Scope

### Tables migrated
| Supabase table | Notes |
|---|---|
| `images` | Primary content table |
| `quotes` | v2 quotes |
| `old_quotes` | v1 quotes |
| `marketplace_analytics` | Views/downloads counters |

`old_images` and `test_images` are excluded — no application code references them.

### Files changed
- `scripts/migrate.js` — new migration script
- `src/db/schema.js` — new Drizzle schema
- `src/db/index.js` — new DB initialiser
- `src/handler.js` — swap Supabase middleware for Drizzle
- `src/v1/images.js`
- `src/v1/quotes.js`
- `src/v2/images/index.js`
- `src/v2/quotes.js`
- `src/v2/marketplace/stats.js`
- `src/v2/marketplace/items/basic.js` — contains `incrementItemView`, `incrementItemDownload`, and analytics join in `getItems`
- `wrangler.toml` — uncomment D1 binding, remove Supabase secrets note
- `package.json` — add `drizzle-orm`, remove `@supabase/supabase-js`

Note: `src/v1/marketplace/index.js` imports `incrementItemView` from `basic.js` — no direct Supabase calls, no changes needed there.

---

## Phase 1: Migration Script

**File:** `scripts/migrate.js`

A Bun script run once to export Supabase data and import it into D1.

### Flow
1. Read `SUPABASE_URL` and `SUPABASE_TOKEN` from environment
2. For each table, fetch all rows in batches of 1000 until exhausted
3. Write `migrations/schema.sql` — SQLite-compatible DDL
4. Write `migrations/seed.sql` — bulk `INSERT OR IGNORE` statements
5. Execute both against D1 via `wrangler d1 execute mue-content`

### Type mappings (Postgres → SQLite)
| Postgres | SQLite |
|---|---|
| `uuid`, `character varying`, `text` | `TEXT` |
| `bigint`, `integer`, `smallint` | `INTEGER` |
| `timestamp with/without time zone` | `TEXT` |
| `GENERATED ALWAYS AS IDENTITY` | Plain `INTEGER NOT NULL UNIQUE` |
| `DEFAULT now()` | `DEFAULT CURRENT_TIMESTAMP` |
| `uuid_generate_v4()` | Omitted (app-level for new rows) |

### schema.sql (generated)
```sql
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  camera TEXT DEFAULT 'landscapes',
  created_at TEXT,
  location_data TEXT,
  location_name TEXT,
  photographer TEXT,
  category TEXT,
  original_file_name TEXT,
  colour TEXT NOT NULL DEFAULT '#000000',
  pun INTEGER NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1668190000,
  blur_hash TEXT
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  author TEXT,
  author_occupation TEXT,
  language TEXT,
  quote TEXT
);

CREATE TABLE IF NOT EXISTS old_quotes (
  id TEXT PRIMARY KEY,
  author TEXT,
  quote TEXT,
  language TEXT,
  author_occupation TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_analytics (
  item_id TEXT NOT NULL,
  category TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, category)
);

CREATE INDEX IF NOT EXISTS idx_images_category ON images(category);
CREATE INDEX IF NOT EXISTS idx_quotes_language ON quotes(language);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_views ON marketplace_analytics(views);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_downloads ON marketplace_analytics(downloads);
```

Note: Indexes use ascending order only — D1 handles descending order scans without a dedicated DESC index.

---

## Phase 2: Drizzle Schema

**File:** `src/db/schema.js`

Defines all four tables using `drizzle-orm/sqlite-core`. Exported as named constants so route files can import directly.

```js
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
```

---

## Phase 3: DB Initialiser

**File:** `src/db/index.js`

```js
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export const getDB = (env) => drizzle(env.DB, { schema });
```

**`src/handler.js` middleware change:**
```js
// Before
c.set('supabase', createClient(c.env.SUPABASE_URL, c.env.SUPABASE_TOKEN));

// After
c.set('db', getDB(c.env));
```

---

## Phase 4: Route Rewrites

### plpgsql → Drizzle query mapping

| Old RPC | Drizzle equivalent |
|---|---|
| `get_image_categories()` | `db.select({ name: images.category, count: count() }).from(images).groupBy(images.category).orderBy(desc(count()))` |
| `get_image_photographers()` | Same pattern on `images.photographer` |
| `get_quote_languages()` | Same pattern on `quotes.language` |
| `get_random_image({ _category, _exclude })` | See below |
| `get_random_quote({ _language })` | `db.select().from(quotes).where(eq(quotes.language, lang)).orderBy(sql\`RANDOM()\`).limit(1)` |
| `get_random_old_quote({ _language })` | `db.select().from(oldQuotes).where(eq(oldQuotes.language, lang)).orderBy(sql\`RANDOM()\`).limit(1)` |

### Response shape preservation

`get_image_categories` and `get_image_photographers` return `{ name, count }` objects from Drizzle.
- **v1** handlers call `.map((row) => row.name)` on the result — this mapping **stays unchanged**
- **v2** handlers return the raw objects — also **unchanged**

Same applies to `get_quote_languages` — the v2 quotes handler maps `.name` on the cached result, which continues to work since Drizzle returns the same `{ name, count }` shape.

`v1/quotes.js` hardcodes `['English', 'French']` for the languages list — this stays as-is. Only the single RPC call (`get_random_old_quote`) needs rewriting.

### `get_random_image` with exclude guard

SQLite raises an error on `WHERE pun NOT IN ()` (empty list). The exclude clause must be conditionally applied:

```js
const excludeList = c.req.query('exclude')?.split(',').map(Number).filter(Boolean) ?? [];
const conditions = [eq(images.category, category)];
if (excludeList.length > 0) {
  conditions.push(notInArray(images.pun, excludeList));
}
const data = await db.select().from(images)
  .where(and(...conditions))
  .orderBy(sql`RANDOM()`)
  .limit(1)
  .then((rows) => rows[0]);
```

### `marketplace_analytics` — increment upserts (`basic.js`)

Each increment function does two operations: upsert the counter, then read back the current values for the response. The `debug` field currently contains `{ rpcError, fetchError }` from Supabase — after migration these become `null` since Drizzle throws on error rather than returning error objects.

```js
// incrementItemView
await db.insert(marketplaceAnalytics)
  .values({ itemId: itemKey, category: resolvedCategory, views: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
  .onConflictDoUpdate({
    target: [marketplaceAnalytics.itemId, marketplaceAnalytics.category],
    set: { views: sql`views + 1`, updatedAt: sql`CURRENT_TIMESTAMP` },
  });

const analyticsData = await db
  .select({ views: marketplaceAnalytics.views, downloads: marketplaceAnalytics.downloads })
  .from(marketplaceAnalytics)
  .where(and(eq(marketplaceAnalytics.itemId, itemKey), eq(marketplaceAnalytics.category, resolvedCategory)))
  .get();

// Response: { debug: { rpcError: null, fetchError: null }, downloads: analyticsData?.downloads || 0, views: analyticsData?.views || 1 }
```

```js
// incrementItemDownload — same upsert pattern with downloads column
await db.insert(marketplaceAnalytics)
  .values({ itemId: itemKey, category: resolvedCategory, downloads: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
  .onConflictDoUpdate({
    target: [marketplaceAnalytics.itemId, marketplaceAnalytics.category],
    set: { downloads: sql`downloads + 1`, updatedAt: sql`CURRENT_TIMESTAMP` },
  });

const analyticsData = await db
  .select({ downloads: marketplaceAnalytics.downloads })
  .from(marketplaceAnalytics)
  .where(and(eq(marketplaceAnalytics.itemId, itemKey), eq(marketplaceAnalytics.category, resolvedCategory)))
  .get();

// Response: { debug: { rpcError: null, fetchError: null }, downloads: analyticsData?.downloads || 1 }
```

### `marketplace_analytics` — trending query (`stats.js`)

The `category` filter is conditional. Drizzle throws on error (no `{ data, error }` tuple), so the existing `dbError` check becomes a `try/catch` to preserve the 500 contract:

```js
try {
  const query = db
    .select({ itemId: marketplaceAnalytics.itemId, category: marketplaceAnalytics.category, views: marketplaceAnalytics.views, downloads: marketplaceAnalytics.downloads })
    .from(marketplaceAnalytics)
    .orderBy(desc(marketplaceAnalytics.views))
    .limit(limit * 3);

  const analyticsData = await (category
    ? query.where(eq(marketplaceAnalytics.category, category))
    : query);
  // ... rest of function
} catch {
  return c.json({ error: 'Failed to fetch trending items' }, 500);
}
```

### `marketplace_analytics` — analytics join in `getItems` (`basic.js`)

When `include_analytics=true`, `getItems` fetches analytics for a list of item IDs. The `&& supabase` guard becomes just `query.include_analytics === 'true'` since `db` is always available. Must guard against an empty `itemIds` array since `inArray(col, [])` throws in SQLite:

```js
// Before
if (query.include_analytics === 'true' && supabase) { ... }

// After
if (query.include_analytics === 'true') {
  const itemIds = data.map((item) => item.name || item.id);
  if (itemIds.length > 0) {
    const analyticsData = await db
      .select({ itemId: marketplaceAnalytics.itemId, views: marketplaceAnalytics.views, downloads: marketplaceAnalytics.downloads })
      .from(marketplaceAnalytics)
      .where(inArray(marketplaceAnalytics.itemId, itemIds));
    // map analytics onto data as before
  }
}
```

---

## wrangler.toml Changes

Uncomment the D1 binding:
```toml
[[d1_databases]]
  binding = "DB"
  database_name = "mue-content"
  database_id = "5b6376e6-1d2a-4f3b-b463-0d6a1b387be1"
```

Remove `SUPABASE_URL` and `SUPABASE_TOKEN` from secrets comments.

---

## Dependencies

```
+ drizzle-orm
- @supabase/supabase-js
```

No Drizzle Kit needed — schema is managed manually via the migration script.

---

## Error Handling

- Migration script: logs failed batches with table name + offset, continues to next table
- Route handlers: preserve existing error patterns (`c.json({ error: '...' }, 4xx/5xx)`)
- No new error handling added beyond what's already in place

## Testing

After migration:
1. Run `wrangler dev` locally with `--local` D1 binding
2. Hit each endpoint manually: `/v1/images/random`, `/v2/images/random`, `/v2/quotes/random`, `/v1/quotes/random`, `/v2/marketplace/trending`
3. Verify response shapes match existing API contracts
