import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { checkSupabaseHealth } from './db/supabase.js';

import healthRoute from './routes/health.js';
import collegesRoute from './routes/colleges.js';
import listingsRoute from './routes/listings.js';
import requestsRoute from './routes/requests.js';
import dealsRoute from './routes/deals.js';
import couponsRoute from './routes/coupons.js';
import verificationRoute from './routes/verification.js';
import adminRoute from './routes/admin.js';
import uploadRoute from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security and standard middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/uploads')) {
      console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(config.uploadsDir));

// Authentication resolution for all requests
app.use(authenticate);

// Mount API routes
app.use('/api/health', healthRoute);
app.use('/api/colleges', collegesRoute);
app.use('/api/listings', listingsRoute);
app.use('/api/requests', requestsRoute);
app.use('/api/deals', dealsRoute);
app.use('/api/coupons', couponsRoute);
app.use('/api/verification', verificationRoute);
app.use('/api/admin', adminRoute);
app.use('/api/upload', uploadRoute);

// Central error handler
app.use(errorHandler);

// Start server
app.listen(config.port, async () => {
  console.log(`\n========================================`);
  console.log(`🚀 CampusLoop Solid Backend running on port ${config.port}`);
  console.log(`📡 API Base URL: http://localhost:${config.port}/api`);
  console.log(`========================================`);

  const supabaseHealth = await checkSupabaseHealth();
  if (supabaseHealth.configured) {
    console.log(`✅ Supabase Integration: Configured (${config.supabaseUrl})`);
    if (supabaseHealth.schemaReady) {
      console.log(`✅ Supabase Database: Connected with active tables.`);
    } else {
      console.log(`ℹ️  Supabase Database: Schema pending migration. Operating in resilient hybrid mode.`);
    }
  } else {
    console.log(`ℹ️  Supabase: Running in local resilient mode (add credentials in .env to connect live project).`);
  }
  console.log(`========================================\n`);
});

export default app;
