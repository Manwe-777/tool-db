import { ToolDb, ToolDbStorageAdapter } from "tool-db";
import level from "level";
import fs from "fs";
import path from "path";

export default class ToolDbLeveldb extends ToolDbStorageAdapter {
  private database: ReturnType<typeof level> | null = null;
  private isOpen: boolean = false;
  private openError: Error | null = null;
  private closingPromise: Promise<void> | null = null;

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    // Initialize database asynchronously to ensure directory exists first
    this._readyPromise = this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    // Ensure parent directory exists before creating database
    const storagePath = this.storageName;
    const parentDir = path.dirname(storagePath);

    try {
      // Create parent directories recursively if they don't exist
      if (parentDir && parentDir !== "." && parentDir !== storagePath) {
        await fs.promises.mkdir(parentDir, { recursive: true });
      }
      // Also create the storage directory itself
      await fs.promises.mkdir(storagePath, { recursive: true });
    } catch (err: any) {
      // Ignore EEXIST errors (directory already exists)
      if (err.code !== "EEXIST") {
        this.tooldb.logger(`Failed to create directory ${storagePath}:`, err.message);
      }
    }

    // Now create the database
    this.database = level(storagePath);

    // Add error handler to prevent ERR_UNHANDLED_ERROR crashes
    // Cast to EventEmitter since level's types don't expose the 'error' event
    (this.database as any).on("error", (err: any) => {
      // Store the error for later reference but don't crash
      this.openError = err;
      // Only log errors that aren't LOCK file issues during cleanup
      const errMsg = err?.message || String(err);
      this.tooldb.logger(`LevelDB error for ${this.storageName}:`, errMsg);
    });

    // Wait for database to open
    return new Promise<void>((resolve, reject) => {
      this.database!.open((err: any) => {
        if (err) {
          this.openError = err;
          this.tooldb.logger(`LevelDB error for ${this.storageName}:`, err.message || err);
          reject(err);
        } else {
          this.isOpen = true;
          this.tooldb.logger(`LevelDB opened for ${this.storageName}`);
          resolve();
        }
      });
    });
  }

  public async close(): Promise<void> {
    // If a close is already in progress, return that promise
    if (this.closingPromise) {
      return this.closingPromise;
    }

    // Wait for initialization to complete before attempting to close
    // If initialization failed, we still want to try closing if database exists
    try {
      await this.waitForReady();
    } catch (err) {
      // If initialization failed, database might still exist and need closing
      // Continue to attempt close if database exists
    }

    // If database is not open or doesn't exist, resolve immediately
    if (!this.isOpen || !this.database) {
      return Promise.resolve();
    }

    // Create the closing promise and store it to prevent concurrent closes
    this.closingPromise = new Promise<void>((resolve, reject) => {
      this.database!.close((err: any) => {
        // Update state regardless of error
        this.isOpen = false;
        this.database = null;
        this.closingPromise = null; // Clear the promise so close can be called again

        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return this.closingPromise;
  }

  public async put(key: string, data: string) {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      // console.warn(this.storageName, "put", key);

      this.database!.put(key, data, (err: any) => {
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
      this.database!.get(key, (err: any, value: any) => {
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
        this.database!
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
}
