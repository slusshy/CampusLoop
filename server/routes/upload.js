import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = crypto.randomUUID();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP images and PDF documents are allowed.'));
    }
  },
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a file to upload.' });
    }

    const { bucket } = req.body;
    const bucketName = bucket === 'verification-documents' ? 'verification-documents' : 'listing-images';
    let publicUrl = `/uploads/${req.file.filename}`;
    let storagePath = `${req.user.id}/${req.file.filename}`;

    // Try Supabase Storage if available
    if (isSupabaseConfigured && supabase) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const { data, error } = await supabase.storage.from(bucketName).upload(storagePath, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

        if (!error) {
          if (bucketName === 'listing-images') {
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
            if (urlData?.publicUrl) publicUrl = urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn(`[Upload] Supabase Storage upload error, falling back to local storage: ${err.message}`);
      }
    }

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: publicUrl,
      path: publicUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
