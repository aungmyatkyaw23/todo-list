const express = require("express");
const Todo = require("../models/Todo");
const { requireAuth } = require("../middlewares/verify");

const router = express.Router();
const values = {
  priority: ["LOW", "MEDIUM", "HIGH"],
  category: ["WORK", "PERSONAL", "LEARNING", "RELATIONSHIPS"]
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTodo(body, { partial = false } = {}) {
  const todo = {};
  const errors = {};
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  if (!partial || has("title")) {
    const title = String(body.title || "").trim();
    if (!title) errors.title = "Enter a task title.";
    else if (title.length > 120) errors.title = "Title must be 120 characters or fewer.";
    else todo.title = title;
  }

  if (has("description")) {
    const description = String(body.description || "").trim();
    if (description.length > 500) errors.description = "Description must be 500 characters or fewer.";
    else todo.description = description;
  }

  for (const field of ["priority", "category"]) {
    if (has(field)) {
      if (!values[field].includes(body[field])) errors[field] = `Choose a valid ${field}.`;
      else todo[field] = body[field];
    }
  }

  if (has("dueDate")) {
    if (body.dueDate === "" || body.dueDate === null) todo.dueDate = null;
    else {
      const dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) errors.dueDate = "Enter a valid due date.";
      else todo.dueDate = dueDate;
    }
  }

  if (partial && Object.keys(todo).length === 0 && Object.keys(errors).length === 0) {
    errors.todo = "Provide at least one task field to update.";
  }

  return { todo, errors };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, priority, category, q } = req.query;
    const query = { userId: req.session.userId };

    if (["PENDING", "DONE"].includes(status)) query.status = status;
    if (values.priority.includes(priority)) query.priority = priority;
    if (values.category.includes(category)) query.category = category;
    if (typeof q === "string" && q.trim()) {
      const pattern = escapeRegex(q.trim().slice(0, 120));
      query.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } }
      ];
    }

    res.json(await Todo.find(query).sort({ createdAt: -1 }));
  } catch (_error) {
    res.status(500).json({ message: "Failed to load todos." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { todo, errors } = parseTodo(req.body);
  if (Object.keys(errors).length) return res.status(422).json({ error: errors });

  try {
    res.status(201).json(await Todo.create({ ...todo, userId: req.session.userId }));
  } catch (_error) {
    res.status(400).json({ message: "Failed to create todo." });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { todo, errors } = parseTodo(req.body, { partial: true });
  if (Object.keys(errors).length) return res.status(422).json({ error: errors });

  try {
    const updated = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      todo,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Todo not found." });

    res.json(updated);
  } catch (_error) {
    res.status(400).json({ message: "Invalid todo id." });
  }
});

router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!todo) return res.status(404).json({ message: "Todo not found." });

    todo.status = todo.status === "DONE" ? "PENDING" : "DONE";
    todo.completedAt = todo.status === "DONE" ? new Date() : null;
    await todo.save();
    res.json(todo);
  } catch (_error) {
    res.status(400).json({ message: "Invalid todo id." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    if (!todo) return res.status(404).json({ message: "Todo not found." });

    res.status(204).send();
  } catch (_error) {
    res.status(400).json({ message: "Invalid todo id." });
  }
});

module.exports = router;
