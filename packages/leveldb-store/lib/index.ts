import { ToolDb, ToolDbStorageAdapter } from "tool-db";
import level from "level";
import { mkdirSync } from "fs";
import path from "path";

export default class ToolDbLeveldb extends ToolDbStorageAdapter {
  private database;
  private readyPromise: Promise<void>;
  private databasePath: string;

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    const rawStorageName = forceStorageName || db.options.storageName;
    const isSpecialNamespace = rawStorageName.startsWith(":");
    const baseName = isSpecialNamespace
      ? rawStorageName.replace(/[:.]/g, "_")
      : rawStorageName;

    this.databasePath = path.resolve(baseName);

    try {
      mkdirSync(this.databasePath, { recursive: true });
    } catch (err) {
      throw err;
    }

    this.database = level(this.databasePath);
    
    // Add error handler to prevent unhandled errors (cast to any for event types)
    (this.database as any).on('error', (err: any) => {
      // Silently handle database errors to prevent unhandled error crashes
      if (err) {
        console.error('LevelDB error for', this.databasePath, ':', err.message || err);
      }
    });
    
    // Create a promise that resolves when database is ready
    this.readyPromise = new Promise<void>((resolve, reject) => {
      // Check if database is already open
      if ((this.database as any).isOpen()) {
        resolve();
        return;
      }
      
      this.database.open((err: any) => {
        if (err) {
          // Ignore "already open" errors
          if (err.message && err.message.includes('already open')) {
            resolve();
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
  }

  private async waitForReady() {
    await this.readyPromise;
  }

  public async put(key: string, data: string) {
    await this.waitForReady();
    
    return new Promise((resolve, reject) => {
      // console.warn(this.storageName, "put", key);

      this.database.put(key, data, (err: any) => {
        // this.logger("put", key, err, err?.message);
        if (err) {
          reject(new Error("Error inserting data"));
        } else {
          resolve(true);
        }
      });
    });
  }

  public async get(key: string) {
    await this.waitForReady();
    
    return new Promise<string>((resolve, reject) => {
      this.database.get(key, (err: any, value: any) => {
        // this.logger("get", key, err, err?.message);
        if (err) {
          reject(new Error("Error retrieving data"));
        } else {
          resolve(value);
        }
      });
    });
  }

  public async query(key: string) {
    await this.waitForReady();
    
    // console.warn(this.storageName, "QUERY", key);
    return new Promise<string[]>((resolve, reject) => {
      try {
        const array: string[] = [];
        this.database
          .createKeyStream({
            gte: key,
            lte: key + "\uffff",
          })
          .on("data", (data: string) => {
            // if (data.startsWith(key)) {
            array.push(data);
            // }
          })
          .on("error", (err: any) => {
            reject(new Error("Error finding keys"));
          })
          .on("close", () => {
            resolve(array);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async close() {
    await this.waitForReady();
    
    return new Promise<void>((resolve, reject) => {
      this.database.close((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
