import {
  CounterCrdt,
  CRDT_COUNTER,
  MapCrdt,
  ToolDb,
  textRandom,
  VerifyResult,
} from "../packages/tool-db";

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
    peers: [{ host: "localhost", port: 9300 }],
    storageName: `.test-db/test-crdt-network-${name}`,
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

beforeAll(async () => {
  server = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9300,
    storageName: ".test-db/test-crdt-network-server",
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

it("Merges counters from several authors", async () => {
  const key = "crdt-counter-" + textRandom(12);

  const aliceCounter = new CounterCrdt(Alice.userAccount.getAddress() || "");
  aliceCounter.ADD(5);
  await Alice.putCrdt(key, aliceCounter);
  await wait(500);

  const bobCounter = new CounterCrdt(Bob.userAccount.getAddress() || "");
  bobCounter.ADD(5);
  await Bob.putCrdt(key, bobCounter);
  await wait(500);

  const stored = JSON.parse(await server.store.get(key));
  expect(stored.c).toBe(CRDT_COUNTER);

  const chrisCounter = new CounterCrdt(Chris.userAccount.getAddress() || "");
  await Chris.getCrdt(key, chrisCounter);
  expect(chrisCounter.value).toBe(10);
});

// Known issues, see CRDT_SIGNING.md. Remove `.failing` once fixed.
describe("CRDT authentication", () => {
  it.failing(
    "Stores CRDT documents merged from several authors in a verifiable way",
    async () => {
      const key = "crdt-merged-" + textRandom(12);

      const aliceMap = new MapCrdt<string>(
        Alice.userAccount.getAddress() || ""
      );
      aliceMap.SET("alice", "a");
      await Alice.putCrdt(key, aliceMap);
      await wait(500);

      const bobMap = new MapCrdt<string>(Bob.userAccount.getAddress() || "");
      bobMap.SET("bob", "b");
      await Bob.putCrdt(key, bobMap);
      await wait(500);

      // The server stored the merge of both changes under Bob's signature
      const stored = JSON.parse(await server.store.get(key));
      expect(await server.verifyMessage(stored)).toEqual(VerifyResult.Verified);
    }
  );

  it.failing(
    "Does not merge forged changes from a CRDT GET reply",
    async () => {
      const key = "crdt-forged-" + textRandom(12);

      const aliceMap = new MapCrdt<string>(
        Alice.userAccount.getAddress() || ""
      );
      aliceMap.SET("alice", "a");
      await Alice.putCrdt(key, aliceMap);
      await wait(500);

      // A malicious server adds a change "by" Alice that she never made
      const stored = JSON.parse(await server.store.get(key));
      stored.v.push({ t: "SET", k: "alice", a: stored.a, v: "forged", i: 2 });
      await server.store.put(key, JSON.stringify(stored));

      const chrisMap = new MapCrdt<string>(
        Chris.userAccount.getAddress() || ""
      );
      await Chris.getCrdt(key, chrisMap);
      expect(chrisMap.value.alice).toBe("a");
    }
  );
});
