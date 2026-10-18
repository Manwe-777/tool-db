import { textRandom, ToolDb } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";

jest.setTimeout(10000);

let Alice: ToolDb;

beforeAll(async () => {
  Alice = new ToolDb({
    storageName: ".test-db/test-store",
    storageAdapter: ToolDbLeveldb,
  });
  await Alice.ready;
});

afterAll(() => Alice.close());

it("Can write and read inmediately", async () => {
  const testKey = "io-test-" + textRandom(16);
  const testValue = textRandom(24);

  await Alice.store.put(testKey, testValue);
  expect(await Alice.store.get(testKey)).toBe(testValue);
});

it("Rejects reads of missing keys", async () => {
  await expect(Alice.store.get("missing-" + textRandom(16))).rejects.toThrow();
});

it("Can delete keys", async () => {
  const testKey = "delete-test-" + textRandom(16);
  await Alice.store.put(testKey, "value");
  await Alice.store.delete(testKey);
  await expect(Alice.store.get(testKey)).rejects.toThrow();
});

it("Can query keys by prefix", async () => {
  const prefix = "query-test-" + textRandom(8) + "/";
  await Alice.store.put(prefix + "a", "1");
  await Alice.store.put(prefix + "b~ñ", "2");
  await Alice.store.put(prefix.slice(0, -1) + "x", "3");

  expect((await Alice.store.query(prefix)).sort()).toEqual(
    [prefix + "a", prefix + "b~ñ"].sort()
  );
});
