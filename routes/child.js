const express = require('express');
const router = express.Router({ mergeParams: true });

const childController = require('../controllers/child');
const catchAsync = require('../utils/catchAsync');

router
  .route('/')
  .get(catchAsync(childController.index))
  .post(catchAsync(childController.addChild));

router
  .route('/:id')
  .get(catchAsync(childController.showChild))
  .put(catchAsync(childController.updateChild))
  .delete(catchAsync(childController.deleteChild));

module.exports = router;
