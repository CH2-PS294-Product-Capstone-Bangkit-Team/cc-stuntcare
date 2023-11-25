//              ARTICLE ROUTES
// GET /articles        get all articles
// GET /articles/:id    get one article
// POST /articles       create article
// PUT /articles/:id    edit article
// DELETE /articles/:id delete article

const express = require('express');
const router = express.Router();

const articles = require('../controllers/articles');
const catchAsync = require('../utils/catchAsync');
const { validateArticle } = require('../middleware');
const Article = require('../models/article');

router
  .route('/')
  .get(articles.index)
  .post(validateArticle, articles.createArticle);

router.route('/:id').get(articles.showArticle).put(articles.updateArticle);

module.exports = router;
