const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const { PORT = 3000, MONGODB_URI, SESSION_SECRET } = require("./src/config");
const { Router } = require("./src/routes");

if (!MONGODB_URI || !SESSION_SECRET) {
  throw new Error("MONGODB_URI and SESSION_SECRET must be set.");
}

// Connection caching for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  
  mongoose.set("bufferCommands", false);
  try {
    cachedDb = await mongoose.connect(MONGODB_URI, { 
        serverSelectionTimeoutMS: 5000, 
        socketTimeoutMS: 45000 
    });
    console.log("MongoDB connected.");
    return cachedDb;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

const app = express();
app.use(express.json({}));
app.use(express.urlencoded({ extended: true }));

// Ensure database is connected before processing requests
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({ message: "Database connection failed." });
    }
});

app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "sessions", ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, "public")));
Router(app);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found." }));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
