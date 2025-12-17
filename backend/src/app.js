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
  })
);
app.use(helmet());
app.use(morgan("dev"));

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
