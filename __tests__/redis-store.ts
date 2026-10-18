import {
  finalizeEvent,
  generateSecretKey,
  StorageContext,
  textRandom,
} from "../packages/tool-db";

import { StorageEventStore } from "../packages/nostr-relay";
import ToolDbRedis, { redisStore } from "../packages/redis-store";

// Needs a Redis server, CI provides one. Run locally with
// REDIS_URL=redis://localhost:6379 npx jest __tests__/redis-store.ts
const { REDIS_URL } = process.env;
const describeWithRedis = REDIS_URL ? describe : describe.skip;

const context = (storageName: string): StorageContext => ({
  options: { storageName },
  logger: () => undefined,
});

describeWithRedis("Redis store", () => {
  const stores: ToolDbRedis[] = [];

  const createStore = () => {
    const Store = redisStore(REDIS_URL || "");
    const store = new Store(context("test-redis-" + textRandom(8)));
    stores.push(store);
    return store;
  };

  afterAll(() => Promise.all(stores.map((store) => store.close())));

  it("Writes, reads and deletes", async () => {
    const store = createStore();
    await store.put("key", "value");
    await store.put("empty", "");

    expect(await store.get("key")).toBe("value");
    // Empty values are values, not missing keys
    expect(await store.get("empty")).toBe("");

    await store.delete("key");
    await expect(store.get("key")).rejects.toThrow();
  });

  it("Queries keys by prefix, literally", async () => {
    const store = createStore();
    await store.put("a*b/1", "1");
    await store.put("a*b/2", "2");
    await store.put("aXb/3", "3");

    expect((await store.query("a*b/")).sort()).toEqual(["a*b/1", "a*b/2"]);
  });

  it("Keeps stores with different names apart", async () => {
    const a = createStore();
    const b = createStore();
    await a.put("shared-key", "a");

    await expect(b.get("shared-key")).rejects.toThrow();
    expect(await b.query("shared")).toEqual([]);
  });

  it("Works as the event store of a relay", async () => {
    const events = new StorageEventStore(createStore());
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "redis"]],
        content: "hello",
      },
      generateSecretKey()
    );

    expect(await events.add(event)).toBe(true);
    expect(await events.query([{ "#t": ["redis"] }])).toEqual([event]);
  });
});

it("Uses a separate class for each server", () => {
  const A = redisStore("redis://a:6379");
  const B = redisStore("redis://b:6379");
  expect(A).not.toBe(B);
  expect((A as any).url).toBe("redis://a:6379");
  expect((ToolDbRedis as any).url).toBeUndefined();
});
