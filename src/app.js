require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const config = require("./config/config");
const { connectDatabase } = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const notFoundHandler = require("./middleware/notFoundHandler");

// Import routes
const authRoutes = require('./routes/authRoutes')

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use(limiter);

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));




// Static files
app.use(express.static("public"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/v1/auth', authRoutes)

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const port = config.port;
    app.listen(port, () => {
      console.log(
        ` Server running on port ${port} in ${config.nodeEnv} mode`
      );
      console.log(` Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error(" Failed to start server:", error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(" Unhandled Promise Rejection:", err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(" Uncaught Exception:", err.message);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log(" SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

startServer();

module.exports = app;
