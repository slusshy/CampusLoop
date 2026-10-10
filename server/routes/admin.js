import express from 'express';
import { store } from '../db/store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/queue', async (req, res, next) => {
  try {
    const queue = await store.getAdminQueue();
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

router.post('/review', async (req, res, next) => {
  try {
    const { submissionId, status, note } = req.body;
    if (!submissionId || !status) {
      return res.status(400).json({ error: 'Submission ID and status decision are required.' });
    }
    const result = await store.reviewVerification(req.user.id, submissionId, status, note);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/resource/:resource', async (req, res, next) => {
  try {
    const records = await store.getAdminResource(req.params.resource);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.patch('/resource/:resource/:id', async (req, res, next) => {
  try {
    const { resource, id } = req.params;
    const values = req.body;
    let result;
    if (resource === 'Listings') {
      result = await store.updateListingStatus(id, values.status);
    } else if (resource === 'Colleges') {
      result = await store.toggleCollegeActive(id);
    } else if (resource === 'Deals') {
      result = await store.updateDealStatus(id, values.status);
    } else if (resource === 'Reports & activity') {
      result = await store.updateReportStatus(id, values.status);
    } else {
      return res.status(400).json({ error: 'Unsupported resource modification.' });
    }
    res.json({ ok: true, record: result });
  } catch (err) {
    next(err);
  }
});

router.get('/businesses', async (req, res, next) => {
  try {
    const businesses = store.data.businesses.filter(b => b.verified && b.active && !b.demo);
    res.json(businesses);
  } catch (err) {
    next(err);
  }
});

export default router;
