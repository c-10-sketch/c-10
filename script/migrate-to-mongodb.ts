import { readFileSync } from "fs";
import { join } from "path";
import { connectToMongoDB, closeMongoConnection } from "../server/mongodb.js";

interface DbSchema {
  users: any[];
  products: any[];
  orders: any[];
  reviews: any[];
  settings: any;
}

async function migrate() {
  try {
    console.log("Starting migration from database.json to MongoDB...");
    
    // Read database.json
    const dbPath = join(process.cwd(), "database.json");
    const fileContent = readFileSync(dbPath, "utf-8");
    const data: DbSchema = JSON.parse(fileContent);
    
    console.log(`Found ${data.users.length} users, ${data.products.length} products, ${data.orders.length} orders, ${data.reviews.length} reviews`);
    
    // Connect to MongoDB
    const db = await connectToMongoDB();
    
    // Migrate users
    if (data.users.length > 0) {
      const usersCollection = db.collection("users");
      const existingUsers = await usersCollection.countDocuments();
      
      if (existingUsers === 0) {
        await usersCollection.insertMany(data.users);
        console.log(`✓ Migrated ${data.users.length} users`);
      } else {
        console.log(`⚠ Users collection already has ${existingUsers} documents, skipping users migration`);
      }
    }
    
    // Migrate products
    if (data.products.length > 0) {
      const productsCollection = db.collection("products");
      const existingProducts = await productsCollection.countDocuments();
      
      if (existingProducts === 0) {
        await productsCollection.insertMany(data.products);
        console.log(`✓ Migrated ${data.products.length} products`);
      } else {
        console.log(`⚠ Products collection already has ${existingProducts} documents, skipping products migration`);
      }
    }
    
    // Migrate orders
    if (data.orders.length > 0) {
      const ordersCollection = db.collection("orders");
      const existingOrders = await ordersCollection.countDocuments();
      
      if (existingOrders === 0) {
        await ordersCollection.insertMany(data.orders);
        console.log(`✓ Migrated ${data.orders.length} orders`);
      } else {
        console.log(`⚠ Orders collection already has ${existingOrders} documents, skipping orders migration`);
      }
    }
    
    // Migrate reviews
    if (data.reviews.length > 0) {
      const reviewsCollection = db.collection("reviews");
      const existingReviews = await reviewsCollection.countDocuments();
      
      if (existingReviews === 0) {
        await reviewsCollection.insertMany(data.reviews);
        console.log(`✓ Migrated ${data.reviews.length} reviews`);
      } else {
        console.log(`⚠ Reviews collection already has ${existingReviews} documents, skipping reviews migration`);
      }
    }
    
    // Migrate settings
    if (data.settings) {
      const settingsCollection = db.collection("settings");
      const existingSettings = await settingsCollection.findOne({ id: "global" });
      
      if (!existingSettings) {
        await settingsCollection.insertOne(data.settings);
        console.log(`✓ Migrated settings`);
      } else {
        console.log(`⚠ Settings already exist, skipping settings migration`);
      }
    }
    
    console.log("\n✅ Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await closeMongoConnection();
  }
}

migrate();
