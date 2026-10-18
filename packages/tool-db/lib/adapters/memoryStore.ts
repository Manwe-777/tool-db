import ToolDbStorageAdapter from "../adapters-base/storageAdapter";

/**
 * Storage adapter kept in memory, the default one. Data is lost when the
 * process or page closes, use a persistent adapter to keep it.
 */
export default class ToolDbMemoryStore extends ToolDbStorageAdapter {
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

  delete(key: string) {
    delete this.data[key];
    return Promise.resolve(true);
  }

  query(key: string) {
    return Promise.resolve(
      Object.keys(this.data).filter((k) => k.startsWith(key))
    );
  }
}
