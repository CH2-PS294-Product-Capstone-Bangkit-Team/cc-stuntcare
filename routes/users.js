//              USERS ROUTES
// POST /register       register
//  { email, password, no telfon, nama, status,
//  tanggal lahir, imageurl }
// POST /login          add session
// POST /logout          remove session
// GET /articles/:id    get one article
// POST /articles       create article
// PUT /articles/:id    edit article
// DELETE /articles/:id delete article

const express = require('express');
const router = express.Router();

const users = require('../controllers/users');
const catchAsync = require('../utils/catchAsync');
// const { validateArticle } = require('../middleware');

router.route('/register').post(catchAsync(users.register));

router.route('/login').get(users.renderLogin).post(users.login);

router.route('/logout').get(users.logout);

// router
//   .route('/')
//   .get(catchAsync(articles.index))
//   .post(validateArticle, catchAsync(articles.createArticle));

// router.route('/login', post(catchAsync(users.login)));

module.exports = router;
