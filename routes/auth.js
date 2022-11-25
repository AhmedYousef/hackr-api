const express = require('express');
const router = express.Router();

// import validators
const {
  userRegisterValidator,
  userLoginValidator,
  forgetPasswordValidator,
  resetPasswordValidator,
} = require('../validators/auth');
const { runValidation } = require('../validators');

// import controllers
const {
  register,
  registerActivate,
  login,
  requireSignin,
  forgetPassword,
  resetPassword,
} = require('../controllers/auth');
const { default: mongoose } = require('mongoose');

router.post('/register', userRegisterValidator, runValidation, register);
router.post('/register/activate', registerActivate);
router.post('/login', userLoginValidator, runValidation, login);
router.put('/forget-password', forgetPasswordValidator, runValidation, forgetPassword);
router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword);
// router.get('/secret', requireSignin, (req, res) => {
//     res.json({
//         data: 'This is secret page for logged in users only'
//     })
// })

module.exports = router;
