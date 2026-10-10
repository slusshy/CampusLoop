import express from 'express';
import { checkSupabaseHealth } from '../db/supabase.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const supabaseHealth = await checkSupabaseHealth();
    res.json({
      status: 'healthy',
      service: 'CampusLoop Solid Backend',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      supabase: supabaseHealth,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
