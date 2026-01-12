import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { createServer } from "http";
import { existsSync } from "fs";

// Import routes - will be resolved at runtime
// For Vercel: files are copied to api/server during build
// For local: uses parent directory
const getRegisterRoutes = async () => {
  try {
    // Try api/server first (for Vercel after build copies files)
    const routesModule = await import("./server/routes.js");
    return routesModule.registerRoutes;
  } catch {
    // Fallback to parent directory (for local dev)
    const routesModule = await import("../server/routes.js");
    return routesModule.registerRoutes;
  }
};

const app = express();

app.use(
  express.json({
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Express error:", err);
  res.status(status).json({ message });
});

// Initialize app
let appInitialized = false;
let initializationPromise: Promise<void> | null = null;
const httpServer = createServer(app);

async function initializeApp() {
  if (appInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log("Initializing app...");
      const registerRoutes = await getRegisterRoutes();
      await registerRoutes(httpServer, app);
      
      // Serve static files in production
      if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        const distPath = path.resolve(process.cwd(), "dist", "public");
        console.log("Checking for static files at:", distPath);
        if (existsSync(distPath)) {
          app.use(express.static(distPath));
          app.use("*", (_req: Request, res: Response) => {
            res.sendFile(path.resolve(distPath, "index.html"));
          });
          console.log("Static files configured");
        } else {
          console.warn("Static files directory not found:", distPath);
        }
      }
      
      appInitialized = true;
      console.log("App initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      appInitialized = false;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Vercel serverless function handler
export default async function handler(req: Request, res: Response) {
  try {
    await initializeApp();
  } catch (error) {
    console.error("Initialization error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        message: "Failed to initialize application",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined
      });
    }
  }

  // Handle the request with Express
  return new Promise<void>((resolve) => {
    app(req, res, (err: any) => {
      if (err) {
        console.error("Request handling error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
      resolve();
    });
  });
}
