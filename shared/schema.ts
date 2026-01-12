import { z } from "zod";

// ============================================
// DATA MODELS (JSON DB)
// ============================================

// --- Users ---
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string(), // Hashed
  name: z.string(),
  role: z.enum(["admin", "user"]).default("user"),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.pick({ email: true, password: true, name: true, phone: true, address: true });
export type InsertUser = z.infer<typeof insertUserSchema>;


// --- Reviews ---
export const reviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  productId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  date: z.string(), // ISO date string
});
export type Review = z.infer<typeof reviewSchema>;
export const insertReviewSchema = reviewSchema.pick({ userId: true, userName: true, productId: true, rating: true, comment: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;


// --- Products ---
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  originalPrice: z.number(),
  discount: z.number(), // Percentage 0-100
  finalPrice: z.number(), // Calculated
  images: z.array(z.string()),
  colors: z.array(z.string()),
  sizes: z.array(z.string()),
  stock: z.number().min(0).default(0),
  enabled: z.boolean().default(true),
  // reviews: z.array(reviewSchema).default([]), // Storing separately for simpler updates might be better, but embedding is fine for JSON
});
export type Product = z.infer<typeof productSchema>;
export const insertProductSchema = productSchema.omit({ id: true, finalPrice: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;


// --- Orders ---
export const orderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  productUrl: z.string().optional(), // For WhatsApp link context
  quantity: z.number().min(1),
  color: z.string(),
  size: z.string(),
  price: z.number(), // Price at time of order
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(), // C10-ORD-XXXX
  userId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerAddress: z.string(), // Full structured address
  items: z.array(orderItemSchema),
  total: z.number(),
  status: z.enum(["Pending", "Accepted", "Out for Delivery", "Delivered", "Failed", "Cancelled"]),
  createdAt: z.string(), // ISO date
});
export type Order = z.infer<typeof orderSchema>;
export const insertOrderSchema = orderSchema.omit({ id: true, createdAt: true, total: true, status: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;


// --- Settings ---
export const settingsSchema = z.object({
  id: z.string(),
  emailVerificationEnabled: z.boolean().default(false),
  otpApiUrl: z.string().default("https://script.google.com/macros/s/AKfycbyLHd4SIL2D4NApu3cEP3DIMDFjAbgd2nrSjVcEFSJOn4elC-CKeSNNRP7KOwHOxPSO/exec"),
  // Minimum time between OTP sends to the same email (in seconds)
  otpResendIntervalSeconds: z.number().int().min(0).default(60),
  // Maximum number of OTPs that can be sent to the same email per rolling hour
  otpMaxPerEmailPerHour: z.number().int().min(1).default(5),
});
export type Settings = z.infer<typeof settingsSchema>;

// ============================================
// API CONTRACT TYPES
// ============================================

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { token: string; user: User };

export type SearchParams = { q?: string; category?: string };

// For WhatsApp Order
export type WhatsAppOrderRequest = {
  orderId: string;
};
