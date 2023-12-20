const express = require('express');
const router = express.Router({ mergeParams: true });

const users = require('../controllers/users');
const articles = require('../controllers/articles');
const catchAsync = require('../utils/catchAsync');
// const { validateArticle } = require('../middleware');

router.route('/register').post(catchAsync(users.register));

router.route('/logout').get(users.logout);

router.route('/user').get(catchAsync(users.index));

router
  .route('/user/:id')
  .get(catchAsync(users.showParent))
  .put(catchAsync(users.updateParent))
  .delete(catchAsync(users.deleteParent));

router.route('/user/:id/article').post(catchAsync(articles.createArticle));

router
  .route('/user/:userId/article/:id')
  .put(catchAsync(articles.updateArticle));

// router
//   .route('/')
//   .get(catchAsync(articles.index))
//   .post(validateArticle, catchAsync(articles.createArticle));

// router.route('/login', post(catchAsync(users.login)));

module.exports = router;
