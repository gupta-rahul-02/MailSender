import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth";
import { templateRoutes } from "./routes/templates";
import { campaignRoutes } from "./routes/campaigns";
import { settingsRoutes } from "./routes/settings";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { startScheduler } from "./services/scheduler";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

// Public routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Protected routes (require login)
app.use("/api/templates", authMiddleware, templateRoutes);
app.use("/api/campaigns", authMiddleware, campaignRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);

// Serve client static files in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for non-API routes
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});

export default app;
