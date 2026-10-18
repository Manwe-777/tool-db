import {
  CounterCrdt,
  CRDT_COUNTER,
  CRDT_MAP,
  CrdtPutMessage,
  createCrdtData,
  getChangeSetHash,
  isCrdtData,
  MapCrdt,
  MapChanges,
  ToolDb,
  textRandom,
  verifyCrdtData,
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

// Signs a map change set with the account of `db` and sends it to the network
const sendChangeSet = async (
  db: ToolDb,
  key: string,
  changes: MapChanges<string>[]
) => {
  const set = {
    a: db.userAccount.getAddress() || "",
    t: Date.now(),
    c: changes,
  };
  const s = await db.userAccount.signData(getChangeSetHash(key, CRDT_MAP, set));
  const message: CrdtPutMessage = {
    type: "crdtPut",
    id: textRandom(10),
    to: [],
    data: createCrdtData(key, CRDT_MAP, [{ ...set, s }]),
  };
  db.network.sendToAll(message);
  await wait(500);
};

const storedOnServer = async (key: string) => {
  try {
    return JSON.parse(await server.store.get(key));
  } catch (e) {
    return undefined;
  }
};

describe("CRDT authentication", () => {
  it("Stores CRDT documents merged from several authors in a verifiable way", async () => {
    const key = "crdt-merged-" + textRandom(12);

    const aliceMap = new MapCrdt<string>(Alice.userAccount.getAddress() || "");
    aliceMap.SET("alice", "a");
    await Alice.putCrdt(key, aliceMap);
    await wait(500);

    const bobMap = new MapCrdt<string>(Bob.userAccount.getAddress() || "");
    bobMap.SET("bob", "b");
    await Bob.putCrdt(key, bobMap);
    await wait(500);

    // Every change set of the merged document verifies on its own
    const stored = await storedOnServer(key);
    expect(isCrdtData(stored)).toBe(true);
    expect(stored.sets.length).toBe(2);
    expect((await verifyCrdtData(Chris, stored)).length).toBe(2);

    // And other peers accept the merged document from the server
    const chrisMap = new MapCrdt<string>(Chris.userAccount.getAddress() || "");
    await Chris.getCrdt(key, chrisMap);
    await wait(500);
    expect(chrisMap.value).toEqual({ alice: "a", bob: "b" });
    expect(JSON.parse(await Chris.store.get(key)).sets.length).toBe(2);
  });

  it("Does not merge forged changes from a CRDT GET reply", async () => {
    const key = "crdt-forged-" + textRandom(12);

    const aliceMap = new MapCrdt<string>(Alice.userAccount.getAddress() || "");
    aliceMap.SET("alice", "a");
    await Alice.putCrdt(key, aliceMap);
    await wait(500);

    // A malicious server adds a change "by" Alice that she never made
    const stored = await storedOnServer(key);
    stored.sets[0].c.push({
      t: "SET",
      k: "alice",
      a: Alice.userAccount.getAddress(),
      v: "forged",
      i: 2,
    });
    await server.store.put(key, JSON.stringify(stored));

    const chrisMap = new MapCrdt<string>(Chris.userAccount.getAddress() || "");
    await Chris.getCrdt(key, chrisMap);
    expect(chrisMap.value.alice).not.toBe("forged");
  });

  it("Accepts a valid change set from its author", async () => {
    const key = "crdt-valid-" + textRandom(12);

    await sendChangeSet(Bob, key, [
      {
        t: "SET",
        k: "bob",
        a: Bob.userAccount.getAddress() || "",
        v: "b",
        i: 1,
      },
    ]);

    expect((await storedOnServer(key)).sets.length).toBe(1);
  });

  it("Does not accept changes attributed to another author", async () => {
    const key = "crdt-impersonate-" + textRandom(12);

    // Bob signs a change set with a change claiming to be from Alice
    await sendChangeSet(Bob, key, [
      {
        t: "SET",
        k: "alice",
        a: Alice.userAccount.getAddress() || "",
        v: "forged",
        i: 1,
      },
    ]);

    expect(await storedOnServer(key)).toBeUndefined();
  });

  it("Does not accept changes from others in a user namespace", async () => {
    const key = `:${Alice.userAccount.getAddress()}.crdt-namespace-${textRandom(
      12
    )}`;

    await sendChangeSet(Bob, key, [
      {
        t: "SET",
        k: "bob",
        a: Bob.userAccount.getAddress() || "",
        v: "b",
        i: 1,
      },
    ]);

    expect(await storedOnServer(key)).toBeUndefined();
  });

  it("Ignores legacy unsigned CRDT documents", async () => {
    const key = "crdt-legacy-" + textRandom(12);

    Bob.network.sendToAll({
      type: "crdtPut",
      id: textRandom(10),
      to: [],
      data: {
        k: key,
        c: "MAP",
        h: "legacy",
        v: [{ t: "SET", k: "bob", a: "bob", v: "b", i: 1 }],
      },
    } as any);
    await wait(500);

    expect(await storedOnServer(key)).toBeUndefined();
  });
});
