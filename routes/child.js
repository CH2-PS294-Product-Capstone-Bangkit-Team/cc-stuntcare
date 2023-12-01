const express = require('express');
const router = express.Router();

const child = require('../controllers/child');
const catchAsync = require('../utils/catchAsync');

router.route('/').get(catchAsync(child.index)).post(catchAsync(child.addChild));

router
  .route('/:id')
  .put(catchAsync(child.updateChild))
  .delete(catchAsync(child.deleteChild));

// router.route('/:id').get(child.)

module.exports = router;
