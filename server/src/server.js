
const express = require("express");
const cors = require("cors");
const studentRoutes = require("./routes/studentRoutes");
const institutionRoutes = require("./routes/institutionRoutes");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/students", studentRoutes);
app.use("/api/institutions", institutionRoutes);

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    project: "Identix",
    message: "Identix backend is running"
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Identix server is healthy"
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
      console.log(`Identix backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start Identix backend:", error.message);
    process.exit(1);
  }
};

startServer();
