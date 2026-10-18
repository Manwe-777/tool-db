import { StorageContext, ToolDbStorageAdapter } from "tool-db";
import { createClient } from "redis";

export default class toolDbRedis extends ToolDbStorageAdapter {
  private redisClient = createClient();

  constructor(db: StorageContext, forceStorageName?: string) {
    super(db, forceStorageName);

    this._readyPromise = this.redisClient.connect().then(() => { });
  }

  public async put(key: string, data: string) {
    await this.waitForReady();

    await this.redisClient.set(key, data);
    return data;
  }

  public async get(key: string) {
    await this.waitForReady();

    // console.warn("store get", key);
    const v = await this.redisClient.get(key);
    if (v) return v;
    else throw new Error("Error retrieving data");
  }

  public async query(key: string) {
    await this.waitForReady();

    // Escape glob characters, so the key is matched literally as a prefix
    const pattern = key.replace(/[*?[\]\\]/g, "\\$&") + "*";
    const v = await this.redisClient.keys(pattern);
    if (v) return v;
    else throw new Error("Error retrieving data");
  }

  public async delete(key: string) {
    await this.waitForReady();

    await this.redisClient.del(key);
    return true;
  }
}
