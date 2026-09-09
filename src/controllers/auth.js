const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { resend, RESEND_FROM } = require("../config");

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      resolve();
    });
  });
}

exports.register = async (req, res) => {
  try {
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for that email." });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(req.body.password, 12)
    });

    await startSession(req, user._id.toString());
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "An account already exists for that email." });
    }
    res.status(500).json({ message: "Failed to create account." });
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await User.findOne({ email });
    const isMatch = user && await bcrypt.compare(String(req.body.password), user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await startSession(req, user._id.toString());
    res.json({ user: sanitizeUser(user) });
  } catch (_error) {
    res.status(500).json({ message: "Failed to log in." });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ message: "Failed to log out." });

    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.status(204).send();
  });
};

exports.me = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not signed in." });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Session expired." });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (_error) {
    res.status(401).json({ message: "Session expired." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "If the email exists, a reset code has been sent." });
    }

    if (!resend || !RESEND_FROM) {
      return res.status(503).json({ message: "Password reset email is not configured." });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    user.resetCodeHash = crypto.createHash("sha256").update(code).digest("hex");
    user.resetCodeExpires = new Date(Date.now() + 7 * 60 * 1000);
    await user.save();

    try {
      const result = await resend.emails.send({
        from: RESEND_FROM,
        to: email,
        subject: "Your FocusFlow password reset code",
        html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 7 minutes.</p>`
      });

      if (result.error) throw new Error(result.error.message || "Email delivery failed.");
    } catch (error) {
      user.resetCodeHash = null;
      user.resetCodeExpires = null;
      await user.save();
      throw error;
    }

    res.json({ message: "If the email exists, a reset code has been sent." });
  } catch (_error) {
    res.status(503).json({ message: "Unable to send the reset email. Please try again later." });
  }
};

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

async function findValidResetUser(email, otp) {
  return User.findOne({
    email: String(email).trim().toLowerCase(),
    resetCodeHash: hashCode(otp),
    resetCodeExpires: { $gt: new Date() }
  });
}

exports.verifyOtp = async (req, res) => {
  try {
    const user = await findValidResetUser(req.body.email, req.body.otp);
    if (!user) return res.status(400).json({ message: "Invalid or expired reset code." });

    res.json({ message: "Code verified. Choose a new password." });
  } catch (_error) {
    res.status(500).json({ message: "Failed to verify the reset code." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await findValidResetUser(req.body.email, req.body.otp);
    if (!user) return res.status(400).json({ message: "Invalid or expired reset code." });

    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    user.resetCodeHash = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: "Password reset. You can now log in." });
  } catch (_error) {
    res.status(500).json({ message: "Failed to reset password." });
  }
};
