const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../middlewares/validate");
const {
  register,
  login,
  logout,
  me,
  forgotPassword,
  verifyOtp,
  resetPassword
} = require("../controllers/auth");

const router = express.Router();
const emailRule = body("email").isEmail().withMessage("Enter a valid email.").normalizeEmail();
const passwordRule = body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters.");

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 1, max: 80 }).withMessage("Enter a name up to 80 characters."),
    emailRule,
    passwordRule
  ],
  validate,
  register
);

router.post("/login", [emailRule, body("password").notEmpty().withMessage("Enter your password.")], validate, login);
router.post("/logout", logout);
router.get("/me", me);
router.post("/forgot-password", emailRule, validate, forgotPassword);
router.post("/verify-otp", [emailRule, body("otp").isLength({ min: 6, max: 6 }).withMessage("Enter the 6-digit reset code.")], validate, verifyOtp);
router.post(
  "/reset-password",
  [
    emailRule,
    body("otp").isLength({ min: 6, max: 6 }).withMessage("Enter the 6-digit reset code."),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
    body("newConfirmPassword").custom((value, { req }) => value === req.body.newPassword).withMessage("Passwords do not match.")
  ],
  validate,
  resetPassword
);

module.exports = router;
