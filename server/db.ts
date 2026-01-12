
import path from "path";
import fs from "fs";

// Simple JSON DB adapter since we want to avoid complex dependencies for this JSON requirement
export class JsonDb<T> {
  private filePath: string;
  private defaultData: T;
  public data: T;

  constructor(filename: string, defaultData: T) {
    this.filePath = path.join(process.cwd(), filename);
    this.defaultData = defaultData;
    this.data = this.load();
  }

  private load(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error(`Failed to load database from ${this.filePath}:`, error);
    }
    // If file doesn't exist or fails to load, return default and write it
    this.write(this.defaultData);
    return this.defaultData;
  }

  public write(data: T): void {
    this.data = data;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to write database to ${this.filePath}:`, error);
    }
  }

  public async read(): Promise<T> {
    return this.data; // Memory copy is fine for this scale
  }

  public async save(): Promise<void> {
    this.write(this.data);
  }
}
