import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import router from "./routes/routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const API_PREFIX = process.env.API_PREFIX ?? "/api/ai-fashion-generator";

const allowedOrigins = [
  `https://ai-fashion-catalog-generator-tfec.vercel.app`,
  `https://tarun.software`,
  "https://tarun.software/app/ai-fashion-generator",
  `http://localhost:5174`,
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(
    ...process.env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Generation requests will fail.");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(
  morgan("dev", {
    skip: (req) => req.path === "/health",
  })
);
app.use(API_PREFIX, router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
