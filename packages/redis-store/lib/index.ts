import { ToolDb, ToolDbStorageAdapter } from "tool-db";
import { createClient } from "redis";

export default class toolDbRedis extends ToolDbStorageAdapter {
  private redisClient = createClient();
  private readyPromise: Promise<void>;

  constructor(db: ToolDb, forceStorageName?: string) {
    super(db, forceStorageName);

    this.readyPromise = this.redisClient.connect().then(() => {});
  }

  private async waitForReady() {
    await this.readyPromise;
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
    
    const v = await this.redisClient.keys(key + "*");
    if (v) return v;
    else throw new Error("Error retrieving data");
  }
}
