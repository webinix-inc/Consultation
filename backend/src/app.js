const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const routes = require("./api/v1/routes/index"); // Entry point for /api/v1/*
const { errorHandler, notFound } = require('./middlewares/error.middleware.js');

const app = express();

// ─── Middlewares ─────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// CORS: use CORS_ORIGINS env (comma-separated) or fallback for dev
const localhostOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5001", "http://localhost:5002", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
const corsOrigins = envOrigins.length > 0
  ? [...new Set([...envOrigins, ...(process.env.NODE_ENV !== "production" ? localhostOrigins : [])])]
  : localhostOrigins;
app.use(
  cors({
    origin: corsOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan("dev"));

// Serve static files - restrict origin in production, allow CORS origins from env
const path = require("path");
app.use("/public", (req, res, next) => {
  const allowOrigin = process.env.NODE_ENV === "production" && corsOrigins.length > 0
    ? (corsOrigins.includes(req.headers.origin || "") ? req.headers.origin : corsOrigins[0])
    : "*";
  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Type");
  next();
}, express.static(path.join(__dirname, "../public")));

// ─── Rate Limiting ───────────────────────────────────────
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "500", 10);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: rateLimitMax,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1", limiter);

// ─── Routes ──────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 404 Handler ─────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

module.exports = app;
