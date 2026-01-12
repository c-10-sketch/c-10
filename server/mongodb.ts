import { MongoClient, Db, Collection, Document } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://khantusar717_db_user:QE31kfWoHCosDcaY@tusarkhan.uubwkkb.mongodb.net/?appName=TusarKhan";
const DB_NAME = process.env.MONGODB_DB_NAME || "noir-emporium";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Connected to MongoDB successfully");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    console.error("MongoDB URI:", MONGODB_URI ? "Set" : "Not set");
    console.error("DB Name:", DB_NAME);
    throw error;
  }
}

export async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
  const database = await connectToMongoDB();
  return database.collection<T>(collectionName);
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}
