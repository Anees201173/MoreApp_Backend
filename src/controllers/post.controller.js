const { sequelize, Post, Company, User, PostLike, PostRepost } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// Resolve company context for the current user (strict – used for mutations)
async function resolveCompanyId(req) {
  // companyadmin → company where admin_id = user.id
  if (req.user.role === "companyadmin") {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, "Company not found for this admin");
    }
    return company.id;
  }

  // employee user with company_id
  if (req.user.role === "user" && req.user.company_id) {
    return req.user.company_id;
  }

  // superadmin can specify company_id explicitly (query or body)
  if (req.user.role === "superadmin") {
    if (req.query.company_id) {
      return req.query.company_id;
    }
    if (req.body && req.body.company_id) {
      return req.body.company_id;
    }
  }

  throw new ApiError(
    400,
    "Company context is required to create or view posts"
  );
}

// Resolve company context for read-only queries.
// For superadmin, if no company_id is provided, this will return null
// which callers can interpret as "all companies".
async function resolveCompanyIdForQuery(req) {
  // companyadmin → company where admin_id = user.id
  if (req.user.role === "companyadmin") {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, "Company not found for this admin");
    }
    return company.id;
  }

  // employee user with company_id
  if (req.user.role === "user" && req.user.company_id) {
    return req.user.company_id;
  }

  // superadmin can specify company_id explicitly (query or body)
  if (req.user.role === "superadmin") {
    if (req.query.company_id) {
      return req.query.company_id;
    }
    if (req.body && req.body.company_id) {
      return req.body.company_id;
    }
    // no specific company → global scope
    return null;
  }

  throw new ApiError(
    400,
    "Company context is required to view posts"
  );
}

// @desc    Create a new social media post (immediate or scheduled)
// @route   POST /api/v1/posts
// @access  Private (superadmin, companyadmin, user-with-company)
const createPost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const companyId = await resolveCompanyId(req);

  const { title, content, media_urls, scheduled_at } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Post content is required");
  }

  if (!Array.isArray(media_urls) || media_urls.length === 0) {
    throw new ApiError(400, "At least one image or video is required for a post");
  }

  let scheduledAt = null;
  if (scheduled_at) {
    const parsed = new Date(scheduled_at);
    if (!isNaN(parsed.getTime())) {
      scheduledAt = parsed;
    }
  }

  const now = new Date();
  const status = scheduledAt && scheduledAt > now ? "scheduled" : "published";

  const effectiveTitle =
    title && title.trim().length ? title.trim() : content.substring(0, 80);

  const post = await Post.create({
    title: effectiveTitle,
    content,
    media_urls,
    status,
    scheduled_at: scheduledAt,
    company_id: companyId,
    user_id: req.user.id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, { post }, "Post created successfully"));
});

// @desc    Get posts for the current company
// @route   GET /api/v1/posts
// @access  Private (superadmin, companyadmin, user-with-company)
const getCompanyPosts = asyncHandler(async (req, res) => {
  const companyId = await resolveCompanyIdForQuery(req);
  const { status } = req.query;

  const where = {};
  if (companyId) {
    where.company_id = companyId;
  }
  if (status) {
    where.status = status;
  }

  const posts = await Post.findAll({
    where,
    include: [
      { model: User, as: "author", attributes: ["id", "name", "role"] },
      { model: PostLike, as: "likes", attributes: ["id", "user_id"] },
      { model: PostRepost, as: "reposts", attributes: ["id", "user_id"] },
    ],
    order: [
      ["scheduled_at", "ASC"],
      ["createdAt", "DESC"],
    ],
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, { items: posts }, "Posts retrieved successfully")
    );
});

// @desc    Get aggregated insights for company posts (totals + monthly series)
// @route   GET /api/v1/posts/insights
// @access  Private (superadmin, companyadmin, user-with-company)
const getCompanyPostInsights = asyncHandler(async (req, res) => {
  const companyId = await resolveCompanyIdForQuery(req);

  // Basic totals
  const postWhere = {};
  if (companyId) {
    postWhere.company_id = companyId;
  }

  const [totalPosts, totalLikes, totalReposts] = await Promise.all([
    Post.count({ where: postWhere }),
    PostLike.count({
      include: [
        {
          model: Post,
          as: "post",
          required: true,
          attributes: [],
          where: companyId ? { company_id: companyId } : undefined,
        },
      ],
    }),
    PostRepost.count({
      include: [
        {
          model: Post,
          as: "post",
          required: true,
          attributes: [],
          where: companyId ? { company_id: companyId } : undefined,
        },
      ],
    }),
  ]);

  // Monthly engagement series for the last 12 months
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const likeSeriesRows = await PostLike.findAll({
    include: [
      {
        model: Post,
        as: "post",
        required: true,
        attributes: [],
        where: companyId ? { company_id: companyId } : undefined,
      },
    ],
    attributes: [
      [
        sequelize.fn("date_trunc", "month", sequelize.col("post_likes.created_at")),
        "month",
      ],
      [sequelize.fn("COUNT", sequelize.col("post_likes.id")), "likes"],
    ],
    where: {
      created_at: { [Op.gte]: start },
    },
    group: [sequelize.fn("date_trunc", "month", sequelize.col("post_likes.created_at"))],
    order: [[sequelize.fn("date_trunc", "month", sequelize.col("post_likes.created_at")), "ASC"]],
    raw: true,
  });

  const repostSeriesRows = await PostRepost.findAll({
    include: [
      {
        model: Post,
        as: "post",
        required: true,
        attributes: [],
        where: companyId ? { company_id: companyId } : undefined,
      },
    ],
    attributes: [
      [
        sequelize.fn("date_trunc", "month", sequelize.col("post_reposts.created_at")),
        "month",
      ],
      [sequelize.fn("COUNT", sequelize.col("post_reposts.id")), "reposts"],
    ],
    where: {
      created_at: { [Op.gte]: start },
    },
    group: [sequelize.fn("date_trunc", "month", sequelize.col("post_reposts.created_at"))],
    order: [[sequelize.fn("date_trunc", "month", sequelize.col("post_reposts.created_at")), "ASC"]],
    raw: true,
  });

  // Build a 12‑month timeline from oldest to newest
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7); // YYYY-MM
    buckets.push({
      key,
      month: monthNames[d.getMonth()],
      likes: 0,
      reposts: 0,
    });
  }

  likeSeriesRows.forEach((row) => {
    const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
    const key = monthDate.toISOString().slice(0, 7);
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.likes = parseInt(row.likes, 10) || 0;
    }
  });

  repostSeriesRows.forEach((row) => {
    const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
    const key = monthDate.toISOString().slice(0, 7);
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.reposts = parseInt(row.reposts, 10) || 0;
    }
  });

  const lineData = buckets.map((b) => ({
    month: b.month,
    likes: b.likes,
    reposts: b.reposts,
  }));

  const payload = {
    totals: {
      posts: totalPosts,
      likes: totalLikes,
      comments: 0, // comments not implemented yet
      reposts: totalReposts,
    },
    donut: [
      { name: "Likes", value: totalLikes },
      { name: "Comments", value: 0 },
      { name: "Reposts", value: totalReposts },
    ],
    lineData,
  };

  res
    .status(200)
    .json(new ApiResponse(200, payload, "Post insights retrieved successfully"));
});

// @desc    Toggle like on a post for the current user
// @route   POST /api/v1/posts/:id/like
// @access  Private (any authenticated role)
const toggleLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findByPk(id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const existing = await PostLike.findOne({
    where: {
      post_id: post.id,
      user_id: req.user.id,
    },
  });

  let liked;

  if (existing) {
    await existing.destroy();
    liked = false;
  } else {
    await PostLike.create({ post_id: post.id, user_id: req.user.id });
    liked = true;
  }

  const likesCount = await PostLike.count({ where: { post_id: post.id } });

  res.status(200).json(
    new ApiResponse(200, { liked, likesCount }, "Like status updated successfully")
  );
});

// @desc    Toggle repost on a post for the current user
// @route   POST /api/v1/posts/:id/repost
// @access  Private (any authenticated role)
const toggleRepost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findByPk(id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const existing = await PostRepost.findOne({
    where: {
      post_id: post.id,
      user_id: req.user.id,
    },
  });

  let reposted;

  if (existing) {
    await existing.destroy();
    reposted = false;
  } else {
    await PostRepost.create({ post_id: post.id, user_id: req.user.id });
    reposted = true;
  }

  const repostsCount = await PostRepost.count({ where: { post_id: post.id } });

  res.status(200).json(
    new ApiResponse(200, { reposted, repostsCount }, "Repost status updated successfully")
  );
});

// @desc    Delete a post
// @route   DELETE /api/v1/posts/:id
// @access  Private (superadmin, companyadmin, user-with-company)
const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findByPk(id);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Ensure the current user belongs to the same company (or is superadmin)
  const companyId = await resolveCompanyId(req);
  if (post.company_id !== companyId && req.user.role !== "superadmin") {
    throw new ApiError(403, "Not authorized to delete this post");
  }

  await post.destroy();

  res.status(200).json(new ApiResponse(200, null, "Post deleted successfully"));
});

module.exports = {
  createPost,
  getCompanyPosts,
  deletePost,
  toggleLike,
  toggleRepost,
  getCompanyPostInsights,
};
