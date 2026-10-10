import express from 'express';
import { store } from '../db/store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate', requireAuth, requireRole('admin', 'business'), async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please enter a student redemption code.' });
    }
    const result = await store.validateCoupon(req.user.id, code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
