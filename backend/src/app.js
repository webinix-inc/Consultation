const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const routes = require("./api/v1/routes/index"); // Entry point for /api/v1/*
const { errorHandler, notFound } = require('./middlewares/error.middleware.js');

const app = express();

// ─── Middlewares ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5001", "http://localhost:5173", "https://consultation-tau.vercel.app", "https://consultation-admin.vercel.app", "http://13.203.42.82", "http://localhost:5175", "http://52.66.228.187/admin/", "http://localhost:5174", "http://localhost:5002"], // Allow frontend on port 5001
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

// Serve static files with explicit CORS headers
const path = require("path");
app.use("/public", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Type");
  next();
}, express.static(path.join(__dirname, "../public")));

// ─── Rate Limiting ───────────────────────────────────────
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
// });
// app.use(limiter);

// ─── Routes ──────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 404 Handler ─────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

module.exports = app;
