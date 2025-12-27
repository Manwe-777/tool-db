import { ToolDb, ToolDbStorageAdapter } from "tool-db";
import level from "level";

export default class ToolDbLeveldb extends ToolDbStorageAdapter {
  private database;
  private readyPromise: Promise<void>;
  private isOpen: boolean = false;
  private openError: Error | null = null;

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    this.database = level(this.storageName);

    // Add error handler to prevent ERR_UNHANDLED_ERROR crashes
    // Cast to EventEmitter since level's types don't expose the 'error' event
    (this.database as any).on("error", (err: any) => {
      // Store the error for later reference but don't crash
      this.openError = err;
      // Only log errors that aren't LOCK file issues during cleanup
      const errMsg = err?.message || String(err);
      if (!errMsg.includes("LOCK: No such file")) {
        console.error(`LevelDB error for ${this.storageName}:`, errMsg);
      }
    });

    // Create a promise that resolves when database is ready
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.database.open((err: any) => {
        if (err) {
          this.openError = err;
          reject(err);
        } else {
          this.isOpen = true;
          resolve();
        }
      });
    });
  }

  public async close(): Promise<void> {
    if (this.isOpen && this.database) {
      return new Promise<void>((resolve) => {
        this.database.close((err: any) => {
          this.isOpen = false;
          resolve();
        });
      });
    }
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
}
