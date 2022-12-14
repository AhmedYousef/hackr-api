const { check } = require('express-validator');

exports.categoryCreateValidator = [
  check('name').notEmpty().withMessage('Name is required'),
  check('image').notEmpty().withMessage('Image is required'),
  check('content').isLength({ min: 20 }).withMessage('Content is required and should be at least 20 characters long'),
];

exports.categoryUpdateValidator = [
  check('name').notEmpty().withMessage('Name is required'),
  check('content').isLength({ min: 20 }).withMessage('Content is required'),
];
