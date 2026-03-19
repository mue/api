import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_TOKEN = process.env.SUPABASE_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_TOKEN) {
	console.error('Missing Supabase credentials. Set one of:');
	console.error('  SUPABASE_URL + SUPABASE_TOKEN');
	console.error('  NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_TOKEN);

async function fetchAllRows(table) {
	const rows = [];
	let offset = 0;
	const batchSize = 1000;

	while (true) {
		console.log(`  Fetching ${table} offset=${offset}...`);
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.range(offset, offset + batchSize - 1);

		if (error) {
			console.error(`  ERROR fetching ${table} at offset ${offset}:`, error.message);
			break;
		}

		if (!data || data.length === 0) break;

		rows.push(...data);
		if (data.length < batchSize) break;
		offset += batchSize;
	}

	console.log(`  ${table}: ${rows.length} rows`);
	return rows;
}

function escapeValue(val) {
	if (val === null || val === undefined) return 'NULL';
	if (typeof val === 'number') return String(val);
	if (typeof val === 'boolean') return val ? '1' : '0';
	return `'${String(val).replace(/'/g, "''")}'`;
}

function rowsToInserts(table, rows) {
	if (rows.length === 0) return '';
	const cols = Object.keys(rows[0]).map((c) => `"${c}"`).join(', ');
	return rows
		.map((row) => {
			const vals = Object.values(row).map(escapeValue).join(', ');
			return `INSERT OR IGNORE INTO "${table}" (${cols}) VALUES (${vals});`;
		})
		.join('\n');
}

const SCHEMA_SQL = `
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
`.trim();

const TABLES = ['images', 'quotes', 'old_quotes', 'marketplace_analytics'];

console.log('Fetching data from Supabase...');
const allData = {};
for (const table of TABLES) {
	allData[table] = await fetchAllRows(table);
}

mkdirSync('migrations', { recursive: true });

writeFileSync('migrations/schema.sql', SCHEMA_SQL);
console.log('Written migrations/schema.sql');

const seedLines = TABLES
	.map((table) => rowsToInserts(table, allData[table]))
	.filter(Boolean)
	.join('\n\n');
writeFileSync('migrations/seed.sql', seedLines);
console.log('Written migrations/seed.sql');

console.log('\nSQL files ready. Now run:');
console.log('  bunx wrangler d1 execute mue-content --remote --file=migrations/schema.sql');
console.log('  bunx wrangler d1 execute mue-content --remote --file=migrations/seed.sql');
