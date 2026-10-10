import express from 'express';
import { store } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { listingId, message, requestedFrom, requestedUntil } = req.body;
    if (!listingId || !message) {
      return res.status(400).json({ error: 'Please choose an item and include a message for pickup.' });
    }
    const itemReq = await store.createItemRequest(req.user.id, listingId, message, requestedFrom, requestedUntil);
    res.status(201).json(itemReq);
  } catch (err) {
    next(err);
  }
});

router.post('/manage', requireAuth, async (req, res, next) => {
  try {
    const { requestId, action, returnBy } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action are required.' });
    }
    const result = await store.transitionItemRequest(requestId, req.user.id, action, returnBy);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/activity', requireAuth, async (req, res, next) => {
  try {
    const { type } = req.query;
    const activity = await store.getActivity(req.user.id, type || 'My listings');
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

export default router;
