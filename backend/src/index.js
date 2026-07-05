import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import router from "./routes/routes.js";
import { connectDatabase } from "./config/database.js";
import Admin from "./models/Admin.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const API_PREFIX = process.env.API_PREFIX ?? "/api/ai-fashion-generator";

const allowedOrigins = [
  `https://ai-fashion-catalog-generator-tfec.vercel.app`,
  `https://tarun.software`,
  "https://tarun.software/app/ai-fashion-generator",
  "http://localhost:5173",
  "http://localhost:5173/app/ai-fashion-generator/",
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(
    ...process.env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Generation requests will fail.");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "10mb",
  }),
);
app.use(
  morgan("dev", {
    skip: (req) => req.path === "/health",
  }),
);
app.use(API_PREFIX, router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

// Create default admin user if none exists
async function createDefaultAdmin() {
  try {
    const adminCount = await Admin.countDocuments();

    if (adminCount === 0) {
      const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
      const password = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

      await Admin.createAdmin(email, password, "Default Admin", "super-admin");

      console.log("✓ Default admin user created");
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log("  ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!");
    }
  } catch (error) {
    console.error("Error creating default admin:", error.message);
  }
}

// Start server with database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Create default admin user
    await createDefaultAdmin();

    // Start Express server
    app.listen(port, () => {
      console.log(`✓ Backend server listening on port ${port}`);
      console.log(`  API: http://localhost:${port}${API_PREFIX}`);
      console.log(`  Health: http://localhost:${port}${API_PREFIX}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
