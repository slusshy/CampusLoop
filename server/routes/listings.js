import express from 'express';
import { store } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const {
      collegeId,
      category,
      listingType,
      condition,
      minPrice,
      maxPrice,
      search,
      sort,
    } = req.query;

    const listings = await store.getListings({
      userId: req.user?.id,
      collegeId,
      category,
      listingType,
      condition,
      minPrice,
      maxPrice,
      search,
      sort,
    });
    res.json(listings);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      collegeId,
      title,
      description,
      category,
      listingType,
      condition,
      pickupArea,
      price,
      priceUnit,
      availableFrom,
      availableUntil,
      imagePath,
    } = req.body;

    if (!title || !description || !category || !pickupArea) {
      return res.status(400).json({ error: 'Please provide all required listing details.' });
    }

    const listing = await store.createListing(req.user.id, {
      collegeId: collegeId || req.profile?.college_id,
      title,
      description,
      category,
      listingType,
      condition,
      pickupArea,
      price,
      priceUnit,
      availableFrom,
      availableUntil,
    }, imagePath);

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const favorites = await store.getFavorites(req.user.id);
    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    const { isSaved } = req.body;
    const result = await store.toggleFavorite(req.user.id, req.params.id, Boolean(isSaved));
    res.json({ saved: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/report', requireAuth, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 4) {
      return res.status(400).json({ error: 'Please explain the issue with this listing.' });
    }
    const report = await store.addListingReport(req.user.id, req.params.id, reason);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const listing = await store.updateListingStatus(req.params.id, status);
    res.json(listing);
  } catch (err) {
    next(err);
  }
});

export default router;
