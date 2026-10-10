import express from 'express';
import { store } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { collegeId, legalName, enrollmentStatus, documentPath } = req.body;
    if (!collegeId || !legalName || !enrollmentStatus || !documentPath) {
      return res.status(400).json({ error: 'Please fill in all verification fields and attach an enrollment document.' });
    }
    const submission = await store.submitVerification(req.user.id, {
      collegeId,
      legalName,
      enrollmentStatus,
    }, documentPath);
    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
});

router.get('/check/:publicId', async (req, res, next) => {
  try {
    const result = await store.verifyStudentId(req.params.publicId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/profile/:userId', async (req, res, next) => {
  try {
    const profile = await store.getProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { collegeId, displayName } = req.body;
    const updates = {};
    if (collegeId) updates.college_id = collegeId;
    if (displayName) updates.display_name = displayName.trim();
    const profile = await store.updateProfile(req.user.id, updates);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
