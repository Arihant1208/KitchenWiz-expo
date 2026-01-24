import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import inventoryRoutes from "./routes/inventory";
import recipeRoutes from "./routes/recipes";
import mealPlanRoutes from "./routes/mealPlan";
import shoppingListRoutes from "./routes/shoppingList";
import emailVerificationRoutes from "./routes/emailVerification";
import aiRoutes from "./routes/ai";

import { requireAuth } from "./auth/middleware";

import { logger } from "./logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increased limit for image uploads

// Structured request logging (adds req.log)
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = typeof existing === "string" && existing.trim() ? existing.trim() : randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    // Avoid logging full request bodies by default.
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
          headers: req.headers,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
          headers: res.headers,
        };
      },
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/user", requireAuth, userRoutes);
app.use("/api/inventory", requireAuth, inventoryRoutes);
app.use("/api/recipes", requireAuth, recipeRoutes);
app.use("/api/meal-plan", requireAuth, mealPlanRoutes);
app.use("/api/shopping-list", requireAuth, shoppingListRoutes);
app.use("/api/ai", requireAuth, aiRoutes);
app.use("/api/email-verification", emailVerificationRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date(), version: "1.0.0" });
});

// API health (matches frontend BASE_URL + '/health')
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date(), version: "1.0.0" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "KitchenWiz API Server",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      user: "/api/user",
      inventory: "/api/inventory",
      recipes: "/api/recipes",
      mealPlan: "/api/meal-plan",
      shoppingList: "/api/shopping-list",
    },
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Ensure errors are correlated with request id.
    // req.log is provided by pino-http.
    (req as any).log?.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "KitchenWiz API Server running");
  });
}

export default app;
