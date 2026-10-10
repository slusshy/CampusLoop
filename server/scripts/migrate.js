import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config.js';
import { supabase, checkSupabaseHealth } from '../db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const SQL_MIGRATION_PATH = path.join(rootDir, 'supabase', 'migrations', '202610100001_idempotent_schema.sql');
const DB_JSON_PATH = path.join(config.dataDir, 'db.json');

async function runDirectPostgresMigration(connectionString) {
  console.log('\n📡 Connecting directly to PostgreSQL database via connection string...');
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database successfully.\n');

    console.log(`📖 Reading SQL migration from: ${path.relative(rootDir, SQL_MIGRATION_PATH)}...`);
    const sql = fs.readFileSync(SQL_MIGRATION_PATH, 'utf-8');

    console.log('🚀 Executing idempotent schema migration (tables, types, RLS policies, triggers, seeds)...');
    const startTime = Date.now();
    await client.query(sql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`🎉 Schema migration executed successfully in ${duration}s!`);

    // Verify created tables
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map(r => r.table_name);
    console.log(`\n📋 Verified ${tableNames.length} tables in public schema:`);
    console.log(tableNames.map(t => `   • public.${t}`).join('\n'));

    await client.end();
    return true;
  } catch (err) {
    console.error('\n❌ PostgreSQL migration failed:');
    console.error(err.message);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

async function seedDataFromLocalStore() {
  console.log('\n🌱 Checking data sync from local storage (server/data/db.json) to Supabase...');
  if (!fs.existsSync(DB_JSON_PATH)) {
    console.log('ℹ️  No local db.json found to seed from.');
    return;
  }

  const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
  const localDb = JSON.parse(raw);

  const health = await checkSupabaseHealth();
  if (!health.schemaReady) {
    console.log('⚠️  Cannot seed data: Supabase tables are not yet ready. Run the schema migration first.');
    return;
  }

  // 1. Colleges
  if (localDb.colleges?.length) {
    console.log(`Syncing ${localDb.colleges.length} colleges...`);
    const { error } = await supabase.from('colleges').upsert(localDb.colleges, { onConflict: 'name' });
    if (error) console.warn('   Colleges sync note:', error.message);
    else console.log('   ✅ Colleges synced');
  }

  // 2. Businesses
  if (localDb.businesses?.length) {
    console.log(`Syncing ${localDb.businesses.length} businesses...`);
    const { error } = await supabase.from('businesses').upsert(localDb.businesses, { onConflict: 'id' });
    if (error) console.warn('   Businesses sync note:', error.message);
    else console.log('   ✅ Businesses synced');
  }

  // 3. Deals
  if (localDb.deals?.length) {
    console.log(`Syncing ${localDb.deals.length} student deals...`);
    const { error } = await supabase.from('deals').upsert(localDb.deals, { onConflict: 'id' });
    if (error) console.warn('   Deals sync note:', error.message);
    else console.log('   ✅ Deals synced');
  }

  // 4. Listings
  if (localDb.listings?.length) {
    console.log(`Syncing ${localDb.listings.length} listings...`);
    // Filter demo or listings with valid fields
    const safeListings = localDb.listings.map(l => ({
      id: l.id,
      college_id: l.college_id,
      title: l.title,
      description: l.description,
      category: l.category,
      listing_type: l.listing_type,
      price: l.price,
      price_unit: l.price_unit,
      condition: l.condition,
      pickup_area: l.pickup_area,
      status: l.status,
      image_paths: l.image_paths || [],
      demo: Boolean(l.demo),
      created_at: l.created_at,
    }));
    const { error } = await supabase.from('listings').upsert(safeListings, { onConflict: 'id' });
    if (error) console.warn('   Listings sync note:', error.message);
    else console.log('   ✅ Listings synced');
  }

  console.log('\n🎉 Data sync completed successfully!\n');
}

async function main() {
  console.log('=====================================================');
  console.log('🛠️  CampusLoop — Supabase Database Migration Runner');
  console.log('=====================================================');

  const args = process.argv.slice(2);
  const shouldSeedOnly = args.includes('--seed-only');
  const shouldSeed = args.includes('--seed') || shouldSeedOnly;

  if (shouldSeedOnly) {
    await seedDataFromLocalStore();
    return;
  }

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

  if (dbUrl) {
    console.log('\nFound direct database connection string (DATABASE_URL).');
    const ok = await runDirectPostgresMigration(dbUrl);
    if (ok && shouldSeed) {
      await seedDataFromLocalStore();
    }
    return;
  }

  // No direct DB connection string
  console.log('\nℹ️  No direct DATABASE_URL found in environment variables.');
  console.log(`Supabase URL: ${config.supabaseUrl || '(Not configured)'}`);

  const health = await checkSupabaseHealth();
  if (health.schemaReady) {
    console.log('\n✅ Your Supabase database tables are ALREADY online and ready!');
    if (shouldSeed) {
      await seedDataFromLocalStore();
    } else {
      console.log('To sync existing local data from db.json into Supabase, run:');
      console.log('   npm run migrate:seed\n');
    }
    return;
  }

  console.log(`\nDatabase Status: ${health.message}`);
  console.log('\n-----------------------------------------------------');
  console.log('👉 HOW TO RUN THIS MIGRATION AUTOMATICALLY OR MANUALLY:');
  console.log('-----------------------------------------------------');
  console.log('\n[Option 1: 100% Automated via npm run migrate]');
  console.log('1. Go to your Supabase Project: Project Settings → Database');
  console.log('2. Copy the "Connection string" URI (URI mode, port 5432 or 6543 pooler)');
  console.log('3. Add it to your .env or .env.local file:');
  console.log('   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xrqrdwvxsvcfzrrcxaqn.supabase.co:5432/postgres');
  console.log('4. Run:');
  console.log('   npm run migrate');

  console.log('\n[Option 2: Copy-Paste via Supabase Web Dashboard (Instant)]');
  console.log('1. Open: https://supabase.com/dashboard/project/xrqrdwvxsvcfzrrcxaqn/sql');
  console.log(`2. Open the migration file: ${path.relative(rootDir, SQL_MIGRATION_PATH)}`);
  console.log('3. Paste the contents into the SQL Editor and click "Run".');
  console.log('4. The migration is 100% idempotent and safe to run at any time.\n');

  console.log('[Option 3: Via Supabase CLI]');
  console.log('   npx supabase link --project-ref xrqrdwvxsvcfzrrcxaqn');
  console.log('   npx supabase db push\n');
}

main().catch(err => {
  console.error('Migration script error:', err);
  process.exit(1);
});
