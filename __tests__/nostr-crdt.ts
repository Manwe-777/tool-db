import { WebSocketServer } from "ws";

import {
  CounterCrdt,
  CRDT_EVENT_KIND,
  CRDT_MAP,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  ListCrdt,
  MapChanges,
  MapCrdt,
  NostrEvent,
  ToolDb,
} from "../packages/tool-db";

import { NostrRelay } from "../packages/nostr-relay";

import MemoryStore from "../test-utils/memoryStore";

jest.setTimeout(15000);

const TOPIC = "nostr-crdt-test";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uniqueKey = (name: string) =>
  `${name}-${Math.random().toString(36).slice(2)}`;

const createClient = async (relays: string[]) => {
  const db = new ToolDb({
    storageAdapter: MemoryStore,
    relays,
    topic: TOPIC,
  });
  await db.ready;
  if (!db.isConnected) {
    await new Promise<void>((resolve) => {
      db.onConnect = () => resolve();
    });
  }
  return db;
};

const address = (db: ToolDb) => db.userAccount.getAddress() || "";

/**
 * Signs a map change set event with a new key, for any changes
 */
const signChangeSet = (key: string, changes: any[], secretKey: string) =>
  finalizeEvent(
    {
      kind: CRDT_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["k", `${TOPIC}:${key}`],
        ["c", CRDT_MAP],
      ],
      content: JSON.stringify(changes),
    },
    secretKey
  );

let relay: NostrRelay;
let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;
const clients: ToolDb[] = [];

beforeAll(async () => {
  relay = new NostrRelay();
  await relay.start();
  [Alice, Bob, Chris] = await Promise.all([
    createClient([relay.url]),
    createClient([relay.url]),
    createClient([relay.url]),
  ]);
  clients.push(Alice, Bob, Chris);
});

afterAll(async () => {
  await Promise.all(clients.map((db) => db.close()));
  await relay.close();
});

it("Merges map changes from several authors", async () => {
  const key = uniqueKey("map");

  const aliceMap = new MapCrdt<string>(address(Alice));
  aliceMap.SET("alice", "a");
  await Alice.putCrdt(key, aliceMap);

  const bobMap = new MapCrdt<string>(address(Bob));
  bobMap.SET("bob", "b");
  await Bob.putCrdt(key, bobMap);
  await wait(100);

  const chrisMap = new MapCrdt<string>(address(Chris));
  const doc = await Chris.getCrdt(key, chrisMap);
  expect(chrisMap.value).toEqual({ alice: "a", bob: "b" });
  expect((doc as any).events.length).toBe(2);
});

it("Merges counters from several authors", async () => {
  const key = uniqueKey("counter");

  const aliceCounter = new CounterCrdt(address(Alice));
  aliceCounter.ADD(5);
  await Alice.putCrdt(key, aliceCounter);

  const bobCounter = new CounterCrdt(address(Bob));
  bobCounter.ADD(5);
  await Bob.putCrdt(key, bobCounter);
  await wait(100);

  const chrisCounter = new CounterCrdt(address(Chris));
  await Chris.getCrdt(key, chrisCounter);
  expect(chrisCounter.value).toBe(10);
});

it("Syncs lists", async () => {
  const key = uniqueKey("list");

  const aliceList = new ListCrdt<string>(address(Alice));
  aliceList.PUSH("one");
  aliceList.PUSH("two");
  await Alice.putCrdt(key, aliceList);
  await wait(100);

  const bobList = new ListCrdt<string>(address(Bob));
  await Bob.getCrdt(key, bobList);
  expect(bobList.value).toEqual(["one", "two"]);
});

it("Continues documents from other authors", async () => {
  const key = uniqueKey("continue");

  const aliceCounter = new CounterCrdt(address(Alice));
  aliceCounter.ADD(10);
  await Alice.putCrdt(key, aliceCounter);
  await wait(100);

  const bobCounter = new CounterCrdt(address(Bob));
  await Bob.getCrdt(key, bobCounter);
  bobCounter.ADD(5);
  await Bob.putCrdt(key, bobCounter);
  await wait(100);

  await Alice.getCrdt(key, aliceCounter);
  expect(aliceCounter.value).toBe(15);
});

it("Only publishes new changes authored by us", async () => {
  const key = uniqueKey("own");
  const map = new MapCrdt<string>(address(Alice));
  map.SET("a", "1");
  // A change from someone else, we can not sign it for them
  map.mergeChanges([{ t: "SET", k: "x", a: "someone-else", v: "x", i: 1 }]);

  const first = await Alice.putCrdt(key, map);
  expect(JSON.parse((first as NostrEvent).content)).toEqual([
    { t: "SET", k: "a", a: address(Alice), v: "1", i: 1 },
  ]);

  // Nothing new to publish
  expect(await Alice.putCrdt(key, map)).toBeNull();

  map.SET("a", "2");
  const second = await Alice.putCrdt(key, map);
  expect(JSON.parse((second as NostrEvent).content)).toEqual([
    { t: "SET", k: "a", a: address(Alice), v: "2", i: 2 },
  ]);
});

it("Does not accept changes attributed to another author", async () => {
  const key = uniqueKey("impersonate");

  // Bob signs a change set with a change claiming to be from Alice
  const forged = signChangeSet(
    key,
    [{ t: "SET", k: "alice", a: address(Alice), v: "forged", i: 1 }],
    generateSecretKey()
  );
  await Bob.relays.publish(forged);
  await wait(100);

  const chrisMap = new MapCrdt<string>(address(Chris));
  expect(await Chris.getCrdt(key, chrisMap)).toBeNull();
  expect(chrisMap.value).toEqual({});
});

it("Ignores invalid change sets served by a malicious relay", async () => {
  const key = uniqueKey("evil");
  const aliceKey = `:${address(Alice)}.${key}`;
  const evilKey = generateSecretKey();
  const evilAddress = getPublicKey(evilKey);
  const change = { t: "SET", k: "x", a: evilAddress, v: "evil", i: 1 };

  const served = [
    // Valid change set, but in a namespace the author does not own
    signChangeSet(aliceKey, [change], evilKey),
    // A change by someone else than the signer
    signChangeSet(aliceKey, [{ ...change, a: address(Alice) }], evilKey),
    // Malformed changes
    signChangeSet(aliceKey, [{ t: "SET", a: evilAddress }], evilKey),
  ];

  const evil = new WebSocketServer({ port: 0 });
  await new Promise((resolve) => evil.once("listening", resolve));
  evil.on("connection", (socket) => {
    socket.on("message", (data) => {
      const [type, subId] = JSON.parse(data.toString());
      if (type !== "REQ") return;
      served.forEach((e) => socket.send(JSON.stringify(["EVENT", subId, e])));
      socket.send(JSON.stringify(["EOSE", subId]));
    });
  });

  const victim = await createClient([
    `ws://127.0.0.1:${(evil.address() as any).port}`,
  ]);
  clients.push(victim);
  try {
    const map = new MapCrdt<string>(address(victim));
    expect(await victim.getCrdt(aliceKey, map)).toBeNull();
    expect(map.value).toEqual({});
  } finally {
    await victim.close();
    evil.clients.forEach((socket) => socket.terminate());
    await new Promise((resolve) => evil.close(resolve));
  }
});

it("Sends CRDT updates to subscribers", async () => {
  const key = uniqueKey("subscribed");
  const bobMap = new MapCrdt<string>(address(Bob));

  // Listeners merge the changes in `v`
  Bob.addKeyListener<MapChanges<string>[]>(key, (msg) =>
    bobMap.mergeChanges(msg.v)
  );
  await Bob.subscribeData(key);
  await wait(100);

  const aliceMap = new MapCrdt<string>(address(Alice));
  aliceMap.SET("live", "value");
  await Alice.putCrdt(key, aliceMap);
  await wait(300);

  expect(bobMap.value).toEqual({ live: "value" });
  Bob.unsubscribeData(key);
});

it("Applies custom verificators to change sets", async () => {
  const key = uniqueKey("custom");
  // Only allow insertions, like the example app
  const id = Chris.addCustomVerification(key, async (msg) =>
    msg.v.every((change: any) => change.t !== "DEL")
  );

  const aliceMap = new MapCrdt<string>(address(Alice));
  aliceMap.SET("a", "1");
  await Alice.putCrdt(key, aliceMap);
  aliceMap.DEL("a");
  await Alice.putCrdt(key, aliceMap);
  await wait(100);

  const chrisMap = new MapCrdt<string>(address(Chris));
  await Chris.getCrdt(key, chrisMap);
  expect(chrisMap.value).toEqual({ a: "1" });
  Chris.removeCustomVerification(id);
});
