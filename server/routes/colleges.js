import express from 'express';
import { store } from '../db/store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const colleges = await store.getColleges();
    res.json(colleges);
  } catch (err) {
    next(err);
  }
});

router.post('/request', requireAuth, async (req, res, next) => {
  try {
    const { collegeName, city, region, contactEmail } = req.body;
    if (!collegeName || !city || !region) {
      return res.status(400).json({ error: 'Please provide college name, city and state/region.' });
    }
    const result = await store.addCollegeRequest(req.user.id, {
      collegeName,
      city,
      region,
      contactEmail: contactEmail || req.user.email,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, city, region, country } = req.body;
    if (!name || !city || !region) {
      return res.status(400).json({ error: 'Please provide college name, city and region.' });
    }
    const college = await store.addCollege({ name, city, region, country });
    res.status(201).json(college);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle', requireRole('admin'), async (req, res, next) => {
  try {
    const college = await store.toggleCollegeActive(req.params.id);
    res.json(college);
  } catch (err) {
    next(err);
  }
});

export default router;
