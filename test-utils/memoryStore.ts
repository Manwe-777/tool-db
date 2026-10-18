import { ToolDbStorageAdapter } from "../packages/tool-db";

/**
 * Storage adapter kept in memory, for tests
 */
export default class MemoryStore extends ToolDbStorageAdapter {
  private data: Record<string, string> = {};

  put(key: string, data: string) {
    this.data[key] = data;
    return Promise.resolve(true);
  }

  get(key: string) {
    return key in this.data
      ? Promise.resolve(this.data[key])
      : Promise.reject(new Error("Not found"));
  }

  query(key: string) {
    return Promise.resolve(
      Object.keys(this.data).filter((k) => k.startsWith(key))
    );
  }
}
