import express from 'express';
import { store } from '../db/store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { collegeId } = req.query;
    const deals = await store.getDeals({ collegeId });
    res.json(deals);
  } catch (err) {
    next(err);
  }
});

router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const { dealId } = req.body;
    if (!dealId) {
      return res.status(400).json({ error: 'A valid student deal ID is required.' });
    }
    const result = await store.redeemDeal(req.user.id, dealId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { businessId, collegeId, title, offer, description, category, terms, expiresAt } = req.body;
    if (!businessId || !title || !offer || !expiresAt) {
      return res.status(400).json({ error: 'Please provide business, title, offer description and expiry date.' });
    }
    const deal = await store.addDeal({ businessId, collegeId, title, offer, description, category, terms, expiresAt });
    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const deal = await store.updateDealStatus(req.params.id, status);
    res.json(deal);
  } catch (err) {
    next(err);
  }
});

export default router;
