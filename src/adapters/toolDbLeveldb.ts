import ToolDbStorageAdapter from "../adapters-base/storageAdapter";
import ToolDb from "../tooldb";

export default class ToolDbLeveldb extends ToolDbStorageAdapter {
  private database;

  constructor(db: ToolDb) {
    super(db);

    const level = require("level");
    this.database = level(this.tooldb.options.storageName);
    this.database.open();
  }

  public put(key: string, data: string) {
    return new Promise((resolve, reject) => {
      if (
        !this.database ||
        (this.database.status !== "open" && this.database.status !== "new")
      ) {
        setTimeout(() => {
          resolve(this.put(key, data));
        }, 5);
        return;
      }
      // console.warn(this.tooldb.options.storageName, "put", key);

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

  public get(key: string) {
    return new Promise<string>((resolve, reject) => {
      if (
        !this.database ||
        (this.database.status !== "open" && this.database.status !== "new")
      ) {
        setTimeout(() => {
          resolve(this.get(key));
        }, 5);
        return;
      }

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

  public query(key: string) {
    // console.warn(this.tooldb.options.storageName, "QUERY", key);
    return new Promise<string[]>((resolve, reject) => {
      if (
        !this.database ||
        (this.database.status !== "open" && this.database.status !== "new")
      ) {
        setTimeout(() => {
          resolve(this.query(key));
        }, 5);
        return;
      }

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