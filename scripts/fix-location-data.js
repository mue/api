/* eslint-disable no-console */
import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const local = args.includes('--local');

const DB_NAME = 'mue-content';
const OUTPUT_FILE = 'migrations/fix-location-data.sql';
const locationFlag = local ? '--local' : '--remote';

function wrangler(...wranglerArgs) {
  return execFileSync('bunx', ['wrangler', ...wranglerArgs], { encoding: 'utf8' });
}

function queryD1(sql) {
  const output = wrangler('d1', 'execute', DB_NAME, locationFlag, '--json', '--command', sql);
  return JSON.parse(output);
}

console.log('Fetching malformed location_data rows from D1...');

let rows;
try {
  const result = queryD1("SELECT id, location_data FROM images WHERE location_data LIKE '{%'");
  rows = result?.[0]?.results ?? [];
} catch (err) {
  console.error('Failed to query D1:', err.message);
  process.exit(1);
}

if (rows.length === 0) {
  console.log('No malformed rows found. Nothing to do.');
  process.exit(0);
}

console.log(`Found ${rows.length} malformed row(s). Generating fix SQL...`);

const updateStatements = [];
const skipped = [];

for (const row of rows) {
  const { id, location_data } = row;

  let parsed;
  try {
    parsed = JSON.parse(location_data);
  } catch {
    skipped.push({ id, reason: 'Could not parse JSON', value: location_data });
    continue;
  }

  const lat = parsed.latitude ?? parsed.lat;
  const lng = parsed.longitude ?? parsed.lng ?? parsed.lon;

  if (lat == null || lng == null) {
    skipped.push({ id, reason: 'Missing lat/lng keys', value: location_data });
    continue;
  }

  const fixed = `${lat},${lng}`;
  updateStatements.push(
    `UPDATE images SET location_data = '${fixed}' WHERE id = '${id.replace(/'/g, "''")}';`,
  );
}

if (skipped.length > 0) {
  console.warn('\nSkipped rows (could not fix automatically):');
  for (const s of skipped) {
    console.warn(`  id=${s.id}  reason=${s.reason}  value=${s.value}`);
  }
}

if (updateStatements.length === 0) {
  console.log('\nNo fixable rows after parsing. Exiting.');
  process.exit(0);
}

console.log(`\nGenerated ${updateStatements.length} UPDATE statement(s).`);

mkdirSync('migrations', { recursive: true });
writeFileSync(OUTPUT_FILE, updateStatements.join('\n') + '\n');
console.log(`SQL written to ${OUTPUT_FILE}`);

if (!apply) {
  console.log('\nDry run complete. Review the SQL above, then re-run with --apply to execute.');
  process.exit(0);
}

console.log(`\nApplying fixes to D1 (${local ? 'local' : 'remote'})...`);

try {
  wrangler('d1', 'execute', DB_NAME, locationFlag, `--file=${OUTPUT_FILE}`);
  console.log(`\nDone. ${updateStatements.length} row(s) updated.`);
} catch (err) {
  console.error('Failed to apply SQL:', err.message);
  process.exit(1);
}
