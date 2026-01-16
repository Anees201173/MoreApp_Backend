const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
  createPost,
  getCompanyPosts,
  deletePost,
  toggleLike,
  toggleRepost,
  getCompanyPostInsights,
} = require('../controllers/post.controller');

// Validation rules for creating a post
const createPostValidation = [
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
  body('scheduled_at')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('scheduled_at must be a valid date-time string'),
];

// Routes
router.post(
  '/',
  auth,
  authorize('superadmin', 'companyadmin', 'user'),
  createPostValidation,
  createPost
);

router.get(
  '/',
  auth,
  authorize('superadmin', 'companyadmin', 'user'),
  getCompanyPosts
);

router.get(
  '/insights',
  auth,
  authorize('superadmin', 'companyadmin', 'user'),
  getCompanyPostInsights
);

router.delete(
  '/:id',
  auth,
  authorize('superadmin', 'companyadmin', 'user'),
  deletePost
);

router.post(
  '/:id/like',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant', 'user'),
  toggleLike
);

router.post(
  '/:id/repost',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant', 'user'),
  toggleRepost
);

module.exports = router;
