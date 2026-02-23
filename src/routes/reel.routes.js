const express = require('express');
const { body } = require('express-validator');

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { createReel, getMyReels } = require('../controllers/post.controller');

const router = express.Router();

const createReelValidation = [
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Title must be at most 150 characters'),
  body('media_urls')
    .optional()
    .isArray()
    .withMessage('media_urls must be an array of URLs'),
  body('hashtags')
    .optional()
    .isArray({ max: 30 })
    .withMessage('hashtags must be an array (max 30 items)'),
  body('hashtags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('each hashtag must be a non-empty string (max 50 chars)'),
  body('scheduled_at')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('scheduled_at must be a valid date-time string'),
];

// POST /api/v1/reels
router.post(
  '/',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant', 'user'),
  createReelValidation,
  createReel
);

// GET /api/v1/reels/me
router.get(
  '/me',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant', 'user'),
  getMyReels
);

module.exports = router;
