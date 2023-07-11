import { ToolDb, ToolDbStorageAdapter } from "tool-db";
import { createClient } from "redis";

export default class toolDbRedis extends ToolDbStorageAdapter {
  private redisClient = createClient();

  private connected = false;

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    this.redisClient.connect().then(() => {
      this.connected = true;
    });
  }

  public put(key: string, data: string) {
    return new Promise<string>((resolve, reject) => {
      if (this.connected) {
        this.redisClient
          .set(key, data)
          .then(() => resolve(data))
          .catch(reject);
      } else {
        setTimeout(() => {
          resolve(this.put(key, data));
        }, 5);
      }
    });
  }

  public get(key: string) {
    // console.warn("store get", key);
    return new Promise<string>((resolve, reject) => {
      if (this.connected) {
        this.redisClient
          .get(key)
          .then((v) => {
            if (v) resolve(v);
            else reject(new Error("Error retrieving data"));
          })
          .catch(reject);
      } else {
        setTimeout(() => {
          resolve(this.get(key));
        }, 5);
      }
    });
  }

  public query(key: string) {
    return new Promise<string[]>((resolve, reject) => {
      if (this.connected) {
        this.redisClient
          .keys(key + "*")
          .then((v) => {
            if (v) resolve(v);
            else reject(new Error("Error retrieving data"));
          })
          .catch(reject);
      } else {
        setTimeout(() => {
          resolve(this.query(key));
        }, 5);
      }
    });
  }
}
