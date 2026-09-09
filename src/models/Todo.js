const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: ["PENDING", "DONE"],
      default: "PENDING"
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM"
    },
    category: {
      type: String,
      enum: ["WORK", "PERSONAL", "LEARNING", "RELATIONSHIPS"],
      default: "PERSONAL"
    },
    dueDate: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Todo", todoSchema);
