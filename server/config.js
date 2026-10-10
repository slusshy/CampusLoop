import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env and .env.local
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(),
  supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  allowedOrigin: process.env.CAMPUSLOOP_ALLOWED_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  uploadsDir: path.join(rootDir, 'server', 'uploads'),
  dataDir: path.join(rootDir, 'server', 'data'),
};
