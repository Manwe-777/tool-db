import { textRandom, ToolDb } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

let Alice: ToolDb;

beforeAll(async () => {
  Alice = new ToolDb({
    server: false,
    peers: [],
    storageName: ".test-db/test-store",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  await Alice.anonSignIn();
});

afterAll(async () => {
  // Close the LevelDB connection to prevent post-test async operations
  if (Alice && Alice.store && typeof (Alice.store as any).close === "function") {
    await (Alice.store as any).close();
  }
});

it("Can write and read inmediately", async () => {
  const testKey = "io-test-" + textRandom(16);
  const testValue = textRandom(24);

  await Alice.store.put(testKey, testValue);
  const val = await Alice.store.get(testKey);
  expect(val).toBe(testValue);
});
