const express = require('express');
const router = express.Router({ mergeParams: true });

const childController = require('../controllers/child');
const catchAsync = require('../utils/catchAsync');

router
  .route('/') // Rubah path rute sesuai permintaan Anda
  .get(catchAsync(childController.index))
  .post(catchAsync(childController.addChild));

router
  .route('/:id') // Juga di sini
  .get(catchAsync(childController.showChild))
  .put(catchAsync(childController.updateChild))
  .delete(catchAsync(childController.deleteChild));

module.exports = router;
