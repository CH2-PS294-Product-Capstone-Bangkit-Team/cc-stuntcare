const express = require('express');
const router = express.Router();

const doctorController = require('../controllers/doctors');
const catchAsync = require('../utils/catchAsync');

router.route('/').get(catchAsync(doctorController.index));

router.route('/:id').get(catchAsync(doctorController.showDoctor));

module.exports = router;
