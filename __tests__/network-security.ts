import { ToolDb, textRandom } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

jest.setTimeout(30000);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForConnect = (db: ToolDb) =>
  new Promise<void>((resolve) => {
    if (db.isConnected) resolve();
    db.onConnect = () => resolve();
  });

let server: ToolDb;
let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;

const client = (name: string) =>
  new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9310 }],
    storageName: `.test-db/test-network-security-${name}`,
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

beforeAll(async () => {
  server = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9310,
    storageName: ".test-db/test-network-security-server",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  await wait(500);

  Alice = client("alice");
  Bob = client("bob");
  Chris = client("chris");
  await Promise.all([Alice, Bob, Chris].map(waitForConnect));
  await Promise.all([Alice, Bob, Chris].map((db) => db.anonSignIn()));
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    (server.network as ToolDbWebsockets).server.close(() => resolve());
    setTimeout(resolve, 2000);
  });
});

it("Does not return forged data from a GET reply", async () => {
  const key = "forged-get-" + textRandom(12);
  await Bob.putData(key, "real value");
  await wait(500);

  // A malicious (or compromised) server swaps the value it stores
  const stored = JSON.parse(await server.store.get(key));
  await server.store.put(key, JSON.stringify({ ...stored, v: "forged" }));

  // Chris has nothing locally, so he asks the server
  const value = await Chris.getData(key);
  expect(value).not.toBe("forged");
});

it("Does not return valid data from another key in a GET reply", async () => {
  const key = "swapped-get-" + textRandom(12);
  const otherKey = "swapped-get-other-" + textRandom(12);
  await Bob.putData(key, "real value");
  await Bob.putData(otherKey, "other value");
  await wait(500);

  // The server replies with a valid message, but for a different key
  await server.store.put(key, await server.store.get(otherKey));

  const value = await Chris.getData(key);
  expect(value).not.toBe("other value");
});
