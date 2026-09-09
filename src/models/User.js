const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    resetCodeHash: {
      type: String,
      default: null
    },
    resetCodeExpires: {
      type: Date,
      default: null
    } 
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
