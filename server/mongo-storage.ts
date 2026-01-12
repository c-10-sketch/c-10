import { 
  User, InsertUser, Product, InsertProduct, Order, InsertOrder, Review, InsertReview,
  Settings
} from "../shared/schema.js";
import { IStorage } from "./storage.js";
import { getCollection } from "./mongodb.js";
import { randomUUID } from "crypto";
import { Collection } from "mongodb";

// Helper to remove MongoDB's _id field
function stripMongoId<T>(doc: T | null): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc as any;
  return rest as T;
}

function stripMongoIdArray<T>(docs: T[]): T[] {
  return docs.map(doc => {
    const { _id, ...rest } = doc as any;
    return rest as T;
  });
}

export class MongoStorage implements IStorage {
  private usersCollection: Collection<User> | null = null;
  private productsCollection: Collection<Product> | null = null;
  private ordersCollection: Collection<Order> | null = null;
  private reviewsCollection: Collection<Review> | null = null;
  private settingsCollection: Collection<Settings> | null = null;

  private async initCollections() {
    if (!this.usersCollection) {
      this.usersCollection = await getCollection<User>("users");
      this.productsCollection = await getCollection<Product>("products");
      this.ordersCollection = await getCollection<Order>("orders");
      this.reviewsCollection = await getCollection<Review>("reviews");
      this.settingsCollection = await getCollection<Settings>("settings");
    }
  }

  // Settings
  async getSettings(): Promise<Settings> {
    await this.initCollections();
    let settings = await this.settingsCollection!.findOne({ id: "global" });
    
    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings: Settings = {
        id: "global",
        emailVerificationEnabled: false,
        otpApiUrl: "https://script.google.com/macros/s/AKfycbyLHd4SIL2D4NApu3cEP3DIMDFjAbgd2nrSjVcEFSJOn4elC-CKeSNNRP7KOwHOxPSO/exec",
        otpResendIntervalSeconds: 60,
        otpMaxPerEmailPerHour: 5,
      };
      await this.settingsCollection!.insertOne(defaultSettings as any);
      return defaultSettings;
    }
    
    return stripMongoId(settings) as Settings;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    await this.initCollections();
    const result = await this.settingsCollection!.findOneAndUpdate(
      { id: "global" },
      { $set: updates },
      { returnDocument: "after", upsert: true }
    );
    
    if (!result) {
      throw new Error("Failed to update settings");
    }
    
    return stripMongoId(result) as Settings;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    await this.initCollections();
    const user = await this.usersCollection!.findOne({ id });
    return stripMongoId(user) as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.initCollections();
    const user = await this.usersCollection!.findOne({ email });
    return stripMongoId(user) as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.initCollections();
    const id = randomUUID();
    
    // Admin check logic
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
    
    try {
      await this.usersCollection!.insertOne(user as any);
      return user;
    } catch (error) {
      console.error("Failed to create user in MongoDB:", error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.initCollections();
    const result = await this.usersCollection!.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );
    
    if (!result) {
      throw new Error("User not found");
    }
    
    return stripMongoId(result) as User;
  }

  // Products
  async getProducts(query?: string): Promise<Product[]> {
    await this.initCollections();
    let filter: any = {};
    
    if (query) {
      const lowerQ = query.toLowerCase();
      filter = {
        $or: [
          { name: { $regex: lowerQ, $options: "i" } },
          { description: { $regex: lowerQ, $options: "i" } },
          { colors: { $in: [new RegExp(lowerQ, "i")] } }
        ]
      };
    }
    
    const products = await this.productsCollection!.find(filter).toArray();
    return stripMongoIdArray(products) as Product[];
  }

  async getProduct(id: string): Promise<Product | undefined> {
    await this.initCollections();
    const product = await this.productsCollection!.findOne({ id });
    return stripMongoId(product) as Product | undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    await this.initCollections();
    const id = randomUUID();
    const finalPrice = Math.round(insertProduct.originalPrice * (1 - insertProduct.discount / 100));
    
    const product: Product = {
      ...insertProduct,
      id,
      finalPrice,
      stock: insertProduct.stock ?? 0,
      enabled: insertProduct.enabled ?? true
    };
    
    await this.productsCollection!.insertOne(product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    await this.initCollections();
    const current = await this.productsCollection!.findOne({ id });
    
    if (!current) {
      throw new Error("Product not found");
    }

    const currentClean = stripMongoId(current) as Product;
    const updated = { ...currentClean, ...updates };
    
    // Recalculate price if needed
    if (updates.originalPrice !== undefined || updates.discount !== undefined) {
      updated.finalPrice = Math.round(updated.originalPrice * (1 - updated.discount / 100));
    }

    // Ensure stock is updated correctly
    if (updates.stock !== undefined) {
      updated.stock = updates.stock;
    }

    const result = await this.productsCollection!.findOneAndUpdate(
      { id },
      { $set: updated },
      { returnDocument: "after" }
    );
    
    if (!result) {
      throw new Error("Failed to update product");
    }
    
    return stripMongoId(result) as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.initCollections();
    const result = await this.productsCollection!.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      throw new Error("Product not found");
    }
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    await this.initCollections();
    const order = await this.ordersCollection!.findOne({ id });
    return stripMongoId(order) as Order | undefined;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    await this.initCollections();
    const orders = await this.ordersCollection!.find({ userId }).toArray();
    return stripMongoIdArray(orders) as Order[];
  }

  async getAllOrders(): Promise<Order[]> {
    await this.initCollections();
    const orders = await this.ordersCollection!.find({}).toArray();
    return stripMongoIdArray(orders) as Order[];
  }

  async createOrder(order: InsertOrder & { userId: string, total: number, createdAt: string, status: "Pending" }): Promise<Order> {
    await this.initCollections();
    // Count existing orders to generate ID
    const count = await this.ordersCollection!.countDocuments();
    const id = `C10-ORD-${1001 + count}`;
    
    const newOrder: Order = { ...order, id };
    await this.ordersCollection!.insertOne(newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: Order["status"]): Promise<Order> {
    await this.initCollections();
    const result = await this.ordersCollection!.findOneAndUpdate(
      { id },
      { $set: { status } },
      { returnDocument: "after" }
    );
    
    if (!result) {
      throw new Error("Order not found");
    }
    
    return stripMongoId(result) as Order;
  }

  // Reviews
  async createReview(review: Review): Promise<Review> {
    await this.initCollections();
    await this.reviewsCollection!.insertOne(review);
    return review;
  }

  async getReviewsByProduct(productId: string): Promise<Review[]> {
    await this.initCollections();
    const reviews = await this.reviewsCollection!.find({ productId }).toArray();
    const cleanReviews = stripMongoIdArray(reviews) as Review[];
    return cleanReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review> {
    await this.initCollections();
    const result = await this.reviewsCollection!.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );
    
    if (!result) {
      throw new Error("Review not found");
    }
    
    return stripMongoId(result) as Review;
  }

  async deleteReview(id: string): Promise<void> {
    await this.initCollections();
    const result = await this.reviewsCollection!.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      throw new Error("Review not found");
    }
  }

  // Seed
  async seed(): Promise<void> {
    await this.initCollections();
    const count = await this.productsCollection!.countDocuments();
    
    if (count === 0) {
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
