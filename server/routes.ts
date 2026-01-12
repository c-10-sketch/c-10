import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { api, errorSchemas } from "../shared/routes.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.SESSION_SECRET || "dev_secret_123";

// Middleware to check auth
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed data on startup (don't fail if seeding fails)
  try {
    await storage.seed();
  } catch (error) {
    console.error("Failed to seed database (non-critical):", error);
  }

  // SETTINGS
  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.patch("/api/settings", requireAdmin, async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    res.json(settings);
  });

  type PendingOtpMeta = {
    otp: string;
    expires: number;
    lastSent: number;
    sendCount: number;
    windowStart: number;
  };

  const pendingOtps = new Map<string, PendingOtpMeta>();
  const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window

  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const settings = await storage.getSettings();
    const now = Date.now();

    const cooldownSeconds = settings.otpResendIntervalSeconds ?? 60;
    const maxPerHour = settings.otpMaxPerEmailPerHour ?? 5;

    const existing = pendingOtps.get(email);

    // Enforce resend cooldown
    if (existing) {
      const sinceLast = now - existing.lastSent;
      const minIntervalMs = cooldownSeconds * 1000;
      if (sinceLast < minIntervalMs) {
        const remainingSeconds = Math.ceil((minIntervalMs - sinceLast) / 1000);
        return res
          .status(429)
          .json({ message: "Please wait before requesting another OTP", retryAfterSeconds: remainingSeconds });
      }

      // Enforce per-hour limit
      let { windowStart, sendCount } = existing;
      if (now - windowStart > OTP_WINDOW_MS) {
        // Reset window
        windowStart = now;
        sendCount = 0;
      }
      if (sendCount >= maxPerHour) {
        return res
          .status(429)
          .json({ message: "OTP request limit reached for this email. Try again later." });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare meta, reusing any existing window info
    const baseMeta: PendingOtpMeta = existing
      ? {
          otp,
          expires: now + 10 * 60 * 1000,
          lastSent: now,
          windowStart: existing.windowStart,
          sendCount: existing.sendCount + 1,
        }
      : {
          otp,
          expires: now + 10 * 60 * 1000,
          lastSent: now,
          windowStart: now,
          sendCount: 1,
        };

    pendingOtps.set(email, baseMeta);

    try {
      const url = `${settings.otpApiUrl}?email=${encodeURIComponent(email)}&otp=${otp}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Check if the external API response contains "success" or "OTP sent successfully"
      // Based on user prompt: "{"message":"OTP sent successfully","otp":"654321"}"
      if (data && (data.message === "OTP sent successfully" || data.status === "success")) {
        res.json({ message: "OTP sent successfully" });
      } else {
        res.json({ message: "OTP sent" });
      }
    } catch (err) {
      console.error("OTP send error:", err);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // AUTH
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const otp = req.body.otp; // Explicitly extract otp
      
      const settings = await storage.getSettings();
      if (settings.emailVerificationEnabled) {
        const stored = pendingOtps.get(input.email);
        if (!stored || stored.otp !== String(otp) || Date.now() > stored.expires) {
          return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        pendingOtps.delete(input.email);
      }

      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });

      res.status(201).json({ message: "User registered", userId: user.id });
    } catch (err) {
      console.error("Registration error:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        const errorMessage = err instanceof Error ? err.message : "Internal server error";
        console.error("Full registration error:", err);
        res.status(500).json({ 
          message: "Internal server error",
          error: process.env.NODE_ENV === "development" ? errorMessage : undefined
        });
      }
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json(user);
  });
  
  app.put(api.auth.updateUser.path, authenticateToken, async (req: any, res) => {
      try {
          const updates = api.auth.updateUser.input.parse(req.body);
          // Only allow updating self, and deny role changes
          // Actually admin could update others, but for now let's say self update
          const updated = await storage.updateUser(req.user.id, { ...updates, role: undefined });
          res.json(updated);
      } catch(err) {
          res.status(400).json({ message: "Update failed" });
      }
  });

  // PRODUCTS
  app.get(api.products.list.path, async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const products = await storage.getProducts(query);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put(api.products.update.path, requireAdmin, async (req, res) => {
     try {
        const input = api.products.update.input.parse(req.body);
        const product = await storage.updateProduct(req.params.id, input);
        res.json(product);
     } catch (err) {
        res.status(404).json({ message: "Product not found" });
     }
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
      await storage.deleteProduct(req.params.id);
      res.sendStatus(204);
  });

  // ORDERS
  app.post(api.orders.create.path, async (req, res) => {
    try {
      // Allow guest orders? Requirement says "Cart accessible only when logged in", 
      // but also "Checkout - User must enter Full name...".
      // Assuming user must be logged in to checkout if cart is only for logged in.
      // But let's check token if present, or allow guest if we want.
      // Requirement: "Cart accessible only when logged in". So YES, must be logged in.
      
      // We'll use authenticateToken middleware if we want to enforce it at route level,
      // or manually check here. Let's manually check for flexibility or stick to strict.
      // Let's use authenticateToken logic manually to get user ID.
      
      const authHeader = req.headers['authorization'];
      let userId = "guest";
      
      if (authHeader) {
          const token = authHeader.split(' ')[1];
          try {
              const decoded: any = jwt.verify(token, JWT_SECRET);
              userId = decoded.id;
          } catch (e) {}
      } else {
          return res.status(401).json({ message: "Login required" });
      }

      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder({
          ...input,
          userId,
          total: input.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          createdAt: new Date().toISOString(),
          status: "Pending"
      });
      
      res.status(201).json(order);
    } catch (err) {
       res.status(400).json({ message: "Order creation failed" });
    }
  });

  app.get(api.orders.list.path, authenticateToken, async (req: any, res) => {
      const orders = await storage.getOrdersByUser(req.user.id);
      res.json(orders);
  });

  app.get(api.orders.get.path, authenticateToken, async (req: any, res) => {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.sendStatus(404);
      // Only admin or owner
      if (order.userId !== req.user.id && req.user.role !== 'admin') return res.sendStatus(403);
      res.json(order);
  });
  
  app.post(api.orders.cancel.path, authenticateToken, async (req: any, res) => {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.sendStatus(404);
      
      if (order.userId !== req.user.id && req.user.role !== 'admin') return res.sendStatus(403);
      
      // Allow cancellation only if NOT "Out for Delivery" or "Delivered" or "Failed" or "Cancelled"
      const restrictedStatuses = ["Out for Delivery", "Delivered", "Failed", "Cancelled"];
      if (restrictedStatuses.includes(order.status) && req.user.role !== 'admin') {
          return res.status(400).json({ message: `Cannot cancel order when status is ${order.status}` });
      }

      const updated = await storage.updateOrderStatus(order.id, "Cancelled");
      res.json(updated);
  });

  // Admin Order Routes
  app.get(api.orders.listAll.path, requireAdmin, async (req, res) => {
      const orders = await storage.getAllOrders();
      res.json(orders);
  });

  app.patch(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
      try {
          const { status } = api.orders.updateStatus.input.parse(req.body);
          const order = await storage.updateOrderStatus(req.params.id, status);
          res.json(order);
      } catch(err) {
          res.status(400).json({ message: "Update failed" });
      }
  });

  // REVIEWS
  app.get(api.reviews.list.path, async (req, res) => {
      const reviews = await storage.getReviewsByProduct(req.params.id);
      res.json(reviews);
  });

  app.post(api.reviews.create.path, authenticateToken, async (req: any, res) => {
      try {
          // Use .partial() or manually extract fields because the schema might require userId/userName
          // which are provided by the backend, not the frontend.
          const { productId, rating, comment } = req.body;
          
          if (!productId || !rating) {
            return res.status(400).json({ message: "Product ID and Rating are required" });
          }

          // Check if user already reviewed
          const productReviews = await storage.getReviewsByProduct(productId);
          const existing = productReviews.find(r => r.userId === req.user.id);
          if (existing) {
            return res.status(400).json({ message: "You have already reviewed this product" });
          }

          const review = await storage.createReview({
              id: randomUUID(),
              productId,
              rating,
              comment: comment || "",
              userId: req.user.id,
              userName: req.user.name,
              date: new Date().toISOString()
          });
          res.status(201).json(review);
      } catch(err) {
          console.error("Review creation error:", err);
          res.status(400).json({ message: "Review failed" });
      }
  });

  app.patch("/api/reviews/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      
      // Find the review
      const products = await storage.getProducts();
      let review;
      for (const p of products) {
        const reviews = await storage.getReviewsByProduct(p.id);
        review = reviews.find(r => r.id === id);
        if (review) break;
      }

      if (!review) return res.status(404).json({ message: "Review not found" });
      if (review.userId !== req.user.id) return res.status(403).json({ message: "Not authorized" });

      // Update the review
      // Since storage doesn't have an updateReview, we'll implement it manually or via storage change
      // For now, let's assume we can update it by deleting and re-adding or similar, 
      // but a better way is to add updateReview to storage.
      // I'll update server/storage.ts first.
      const updated = await storage.updateReview(id, { rating, comment });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.reviews.delete.path, authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const products = await storage.getProducts();
      let review;
      for (const p of products) {
        const reviews = await storage.getReviewsByProduct(p.id);
        review = reviews.find(r => r.id === id);
        if (review) break;
      }

      if (!review) return res.status(404).json({ message: "Review not found" });
      if (req.user.role !== 'admin' && review.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteReview(id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  return httpServer;
}
