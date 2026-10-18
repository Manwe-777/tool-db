import { StorageContext, ToolDbStorageAdapter } from "tool-db";
import { createClient } from "redis";

/**
 * Redis storage adapter. Keys are prefixed with the storage name, so several
 * stores can share a Redis server. Connects to the default local server,
 * use `redisStore(url)` for another one.
 */
export default class ToolDbRedis extends ToolDbStorageAdapter {
  /**
   * Redis server url, set by redisStore()
   */
  protected static url: string | undefined = undefined;

  private redisClient: ReturnType<typeof createClient>;

  constructor(db: StorageContext, forceStorageName?: string) {
    super(db, forceStorageName);

    const { url } = this.constructor as typeof ToolDbRedis;
    this.redisClient = createClient(url ? { url } : undefined);
    this._readyPromise = this.redisClient.connect().then(() => undefined);
    // Still rejects for whoever awaits it, without being an unhandled rejection
    this._readyPromise.catch((e) =>
      this.tooldb.logger("Redis connection error", e)
    );
  }

  private get prefix() {
    return `${this.storageName}:`;
  }

  public async put(key: string, data: string) {
    await this.waitForReady();

    await this.redisClient.set(this.prefix + key, data);
    return data;
  }

  public async get(key: string) {
    await this.waitForReady();

    const value = await this.redisClient.get(this.prefix + key);
    if (value === null) throw new Error("Error retrieving data");
    return value;
  }

  public async query(key: string) {
    await this.waitForReady();

    // Escape glob characters, so the key is matched literally as a prefix
    const pattern = (this.prefix + key).replace(/[*?[\]\\]/g, "\\$&") + "*";
    // SCAN instead of KEYS, which blocks the server while it runs
    const keys: string[] = [];
    for await (const found of this.redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 1000,
    })) {
      keys.push(found.slice(this.prefix.length));
    }
    return keys;
  }

  public async delete(key: string) {
    await this.waitForReady();

    await this.redisClient.del(this.prefix + key);
    return true;
  }

  public async close() {
    try {
      await this.waitForReady();
    } catch (e) {
      return;
    }
    await this.redisClient.quit();
  }
}

/**
 * A Redis storage adapter class connected to the given server
 * @param url Redis url, like redis://user:password@host:6379/0
 */
export function redisStore(url: string): typeof ToolDbRedis {
  return class extends ToolDbRedis {
    protected static url = url;
  };
}
