import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { checkSupabaseHealth } from '../db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

async function run() {
  console.log('\n==============================================');
  console.log('🛠️  CampusLoop — Supabase Setup & Diagnostics');
  console.log('==============================================\n');

  console.log(`Supabase URL:      ${config.supabaseUrl || '(Not set)'}`);
  console.log(`Anon Key present:  ${Boolean(config.supabaseAnonKey)}`);
  console.log(`Service Key:       ${Boolean(config.supabaseServiceRoleKey)}\n`);

  console.log('Checking connection to Supabase...');
  const health = await checkSupabaseHealth();

  if (health.schemaReady) {
    console.log('🎉 SUCCESS: Supabase is fully configured and database tables are ready!\n');
    return;
  }

  console.log(`\nStatus: ${health.message}\n`);

  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '202610090001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const stats = fs.statSync(migrationPath);
    console.log(`Migration file found at: supabase/migrations/202610090001_initial_schema.sql (${stats.size} bytes)`);
    console.log('\n--- TO APPLY TO YOUR SUPABASE PROJECT ---');
    console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to SQL Editor in the left sidebar.');
    console.log('3. Open or paste the contents of "supabase/migrations/202610090001_initial_schema.sql".');
    console.log('4. Click "Run".');
    console.log('\nOnce applied, all PostgreSQL tables, RLS policies, triggers and storage buckets will be active!');
    console.log('CampusLoop automatically detects the schema and syncs immediately.\n');
  }
}

run().catch(console.error);
