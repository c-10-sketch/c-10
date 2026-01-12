import { 
  User, InsertUser, Product, InsertProduct, Order, InsertOrder, Review, InsertReview,
  Settings, userSchema, productSchema, orderSchema, reviewSchema, settingsSchema 
} from "../shared/schema.js";
import { JsonDb } from "./db.js";
import { randomUUID } from "crypto";

interface DbSchema {
  users: User[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  settings: Settings;
}

export interface IStorage {
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Products
  getProducts(query?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder & { userId: string, total: number, createdAt: string, status: "Pending" }): Promise<Order>;
  updateOrderStatus(id: string, status: Order["status"]): Promise<Order>;
  
  // Reviews
  createReview(review: InsertReview & { id: string, date: string }): Promise<Review>;
  getReviewsByProduct(productId: string): Promise<Review[]>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  
  // Seeding
  seed(): Promise<void>;
}

export class JsonStorage implements IStorage {
  private db: JsonDb<DbSchema>;

  constructor() {
    this.db = new JsonDb<DbSchema>("database.json", {
      users: [],
      products: [],
      orders: [],
      reviews: [],
      settings: {
        id: "global",
        emailVerificationEnabled: false,
        otpApiUrl: "https://script.google.com/macros/s/AKfycbyLHd4SIL2D4NApu3cEP3DIMDFjAbgd2nrSjVcEFSJOn4elC-CKeSNNRP7KOwHOxPSO/exec",
        otpResendIntervalSeconds: 60,
        otpMaxPerEmailPerHour: 5,
      }
    });
    
    // Ensure settings exist even if db was loaded from file without them
    if (!this.db.data.settings) {
      this.db.data.settings = {
        id: "global",
        emailVerificationEnabled: false,
        otpApiUrl: "https://script.google.com/macros/s/AKfycbyLHd4SIL2D4NApu3cEP3DIMDFjAbgd2nrSjVcEFSJOn4elC-CKeSNNRP7KOwHOxPSO/exec",
        otpResendIntervalSeconds: 60,
        otpMaxPerEmailPerHour: 5,
      };
    }
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.db.data.settings;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    this.db.data.settings = { ...this.db.data.settings, ...updates };
    await this.db.save();
    return this.db.data.settings;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.db.data.users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.db.data.users.find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    // Admin check logic is handled in routes or here?
    // Requirement: If email matches khantusar717@gmail.com -> assign role = "admin"
    let role: "admin" | "user" = "user";
    if (insertUser.email === "khantusar717@gmail.com") {
      role = "admin";
    }

    const user: User = { 
      ...insertUser, 
      id, 
      role,
      phone: insertUser.phone || undefined,
      address: insertUser.address || undefined
    };
    this.db.data.users.push(user);
    await this.db.save();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const userIndex = this.db.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");
    
    const updatedUser = { ...this.db.data.users[userIndex], ...updates };
    this.db.data.users[userIndex] = updatedUser;
    await this.db.save();
    return updatedUser;
  }

  // Products
  async getProducts(query?: string): Promise<Product[]> {
    let products = this.db.data.products;
    if (query) {
      const lowerQ = query.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(lowerQ) || 
        p.description.toLowerCase().includes(lowerQ) ||
        p.colors.some(c => c.toLowerCase().includes(lowerQ))
      );
    }
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.db.data.products.find(p => p.id === id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    // Calculate final price
    const finalPrice = Math.round(insertProduct.originalPrice * (1 - insertProduct.discount / 100));
    
    const product: Product = {
      ...insertProduct,
      id,
      finalPrice,
      stock: insertProduct.stock ?? 0,
      enabled: insertProduct.enabled ?? true
    };
    this.db.data.products.push(product);
    await this.db.save();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const index = this.db.data.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Product not found");

    const current = this.db.data.products[index];
    const updated = { ...current, ...updates };
    
    // Recalculate price if needed
    if (updates.originalPrice !== undefined || updates.discount !== undefined) {
      updated.finalPrice = Math.round(updated.originalPrice * (1 - updated.discount / 100));
    }

    // Ensure stock is updated correctly
    if (updates.stock !== undefined) {
      updated.stock = updates.stock;
    }

    this.db.data.products[index] = updated;
    await this.db.save();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.db.data.products = this.db.data.products.filter(p => p.id !== id);
    await this.db.save();
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    return this.db.data.orders.find(o => o.id === id);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.db.data.orders.filter(o => o.userId === userId);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.db.data.orders;
  }

  async createOrder(order: InsertOrder & { userId: string, total: number, createdAt: string, status: "Pending" }): Promise<Order> {
    // Generate C10-ORD-XXXX ID
    // Find max ID or just random? Requirement says C10-ORD-1001. 
    // Let's count orders and add 1001.
    const count = this.db.data.orders.length;
    const id = `C10-ORD-${1001 + count}`;
    
    const newOrder: Order = { ...order, id };
    this.db.data.orders.push(newOrder);
    await this.db.save();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: Order["status"]): Promise<Order> {
    const index = this.db.data.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Order not found");
    
    this.db.data.orders[index].status = status;
    await this.db.save();
    return this.db.data.orders[index];
  }

  // Reviews
  async createReview(review: Review): Promise<Review> {
    this.db.data.reviews.push(review);
    await this.db.save();
    return review;
  }

  async getReviewsByProduct(productId: string): Promise<Review[]> {
    return this.db.data.reviews.filter(r => r.productId === productId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review> {
    const index = this.db.data.reviews.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Review not found");
    this.db.data.reviews[index] = { ...this.db.data.reviews[index], ...updates };
    await this.db.save();
    return this.db.data.reviews[index];
  }

  async deleteReview(id: string): Promise<void> {
    this.db.data.reviews = this.db.data.reviews.filter(r => r.id !== id);
    await this.db.save();
  }

  // Seed
  async seed(): Promise<void> {
    if (this.db.data.products.length === 0) {
        console.log("Seeding initial products...");
        const products: InsertProduct[] = [
            {
                name: "Noir Oversized Hoodie",
                description: "Premium heavyweight cotton hoodie with dropped shoulders and signature noir branding. Defining luxury streetwear comfort.",
                originalPrice: 4500,
                discount: 10,
                images: [
                    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
                    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80", 
                    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80"
                ],
                colors: ["Black", "Charcoal"],
                sizes: ["S", "M", "L", "XL"],
                stock: 50,
                enabled: true
            },
            {
                name: "Street Cargo Pants",
                description: "Functional meets fashion. Multi-pocket cargo pants crafted from durable technical fabric. A staple for the modern urban explorer.",
                originalPrice: 3800,
                discount: 5,
                images: [
                    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80",
                    "https://images.unsplash.com/photo-1517445312882-6323be0c8c0f?w=800&q=80"
                ],
                colors: ["Black", "Olive"],
                sizes: ["30", "32", "34", "36"],
                stock: 30,
                enabled: true
            },
            {
                name: "Signature Tee",
                description: "The essential base layer. 100% organic cotton with a structured fit and minimal logo placement.",
                originalPrice: 1500,
                discount: 0,
                images: [
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
                    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80"
                ],
                colors: ["White", "Black"],
                sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                stock: 100,
                enabled: true
            },
             {
                name: "Urban Bomber Jacket",
                description: "Sleek silhouette with premium hardware. The perfect outer layer for transitional weather.",
                originalPrice: 6500,
                discount: 15,
                images: [
                    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
                     "https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=800&q=80"
                ],
                colors: ["Black", "Navy"],
                sizes: ["M", "L", "XL"],
                stock: 20,
                enabled: true
            }
        ];

        for (const p of products) {
            await this.createProduct(p);
        }
    }
  }
}

import { MongoStorage } from "./mongo-storage.js";

export const storage = new MongoStorage();
