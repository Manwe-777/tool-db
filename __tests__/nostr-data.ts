import { WebSocketServer } from "ws";

import {
  finalizeEvent,
  generateSecretKey,
  ToolDb,
  VALUE_KIND,
} from "../packages/tool-db";

import { NostrRelay } from "../packages/nostr-relay";

jest.setTimeout(15000);

const TOPIC = "nostr-data-test";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createClient = async (relays: string[], topic = TOPIC) => {
  const db = new ToolDb({
    relays,
    topic,
  });
  await db.ready;
  if (relays.length > 0 && !db.isConnected) {
    await new Promise<void>((resolve) => {
      db.onConnect = () => resolve();
    });
  }
  return db;
};

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

const uniqueKey = (name: string) =>
  `${name}-${Math.random().toString(36).slice(2)}`;

it("Syncs values between clients through relays", async () => {
  const key = uniqueKey("sync");
  await Alice.putData(key, { hello: "world" });
  await wait(100);

  expect(await Bob.getData(key)).toEqual({ hello: "world" });
});

it("Stores values locally, and reads them offline", async () => {
  const offline = await createClient([]);
  clients.push(offline);
  const key = uniqueKey("offline");

  await offline.putData(key, "local value");
  expect(await offline.getData(key)).toBe("local value");
});

it("Reads its own writes with the default store", async () => {
  const db = new ToolDb({ relays: [relay.url], topic: TOPIC });
  clients.push(db);
  const key = uniqueKey("default-store");

  await db.putData(key, "mine");
  expect(await db.getData(key)).toBe("mine");
});

it("Returns null for keys nobody wrote", async () => {
  expect(await Bob.getData(uniqueKey("missing"), false, 300)).toBeNull();
});

it("Keeps the last write, even within the same second", async () => {
  const key = uniqueKey("same-second");
  await Alice.putData(key, "first");
  await Alice.putData(key, "second");
  await Alice.putData(key, "third");
  await wait(100);

  expect(await Alice.getData(key)).toBe("third");
  expect(await Bob.getData(key)).toBe("third");
});

it("Reads user namespaced values of other users", async () => {
  const key = uniqueKey("namespaced");
  await Alice.putData(key, "alice's", true);
  await wait(100);

  const aliceKey = `:${Alice.userAccount.getAddress()}.${key}`;
  expect(await Bob.getData(aliceKey)).toBe("alice's");
});

it("Does not accept writes to a namespace from other users", async () => {
  const key = uniqueKey("not-yours");
  await Alice.putData(key, "alice's", true);
  const aliceKey = `:${Alice.userAccount.getAddress()}.${key}`;

  // Bob signs an event for Alice's key, with a newer timestamp
  const forged = finalizeEvent(
    {
      kind: VALUE_KIND,
      created_at: Math.floor(Date.now() / 1000) + 5,
      tags: [
        ["d", `${TOPIC}:${aliceKey}`],
        ["t", TOPIC],
      ],
      content: JSON.stringify("bob's"),
    },
    generateSecretKey()
  );
  await Bob.relays.publish(forged);
  await wait(100);

  expect(await Chris.getData(aliceKey)).toBe("alice's");
});

it("Keeps the newest value of shared keys across authors", async () => {
  const key = uniqueKey("shared");
  await Alice.putData(key, "alice");
  await wait(1100);
  await Bob.putData(key, "bob");
  await wait(100);

  expect(await Chris.getData(key)).toBe("bob");
});

it("Receives updates of subscribed keys", async () => {
  const key = uniqueKey("subscribed");
  const received: any[] = [];
  Bob.addKeyListener(key, (msg) => received.push(msg.v));
  await Bob.subscribeData(key);
  await wait(100);

  await Alice.putData(key, "update 1");
  await wait(200);
  await Alice.putData(key, "update 2");
  await wait(300);

  expect(received[received.length - 1]).toBe("update 2");
  Bob.unsubscribeData(key);
});

it("Applies custom verificators to values", async () => {
  const key = uniqueKey("custom");
  const id = Chris.addCustomVerification(key, async (msg) =>
    String(msg.v).startsWith("valid")
  );

  await Alice.putData(key, "invalid value");
  await wait(100);
  expect(await Chris.getData(key)).toBeNull();

  await Alice.putData(key, "valid value");
  await wait(100);
  expect(await Chris.getData(key)).toBe("valid value");
  Chris.removeCustomVerification(id);
});

it("Isolates apps with different topics", async () => {
  const other = await createClient([relay.url], "another-topic");
  clients.push(other);
  const key = uniqueKey("topic");

  await Alice.putData(key, "topic value");
  await wait(100);
  expect(await other.getData(key, false, 300)).toBeNull();
});

it("Reads values written by any Nostr client", async () => {
  const key = uniqueKey("interop");
  // A plain Nostr event, as any Nostr library would create it
  const event = finalizeEvent(
    {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", `${TOPIC}:${key}`]],
      content: JSON.stringify([1, 2, 3]),
    },
    generateSecretKey()
  );
  await Alice.relays.publish(event);
  await wait(100);

  expect(await Bob.getData(key)).toEqual([1, 2, 3]);
});

it("Ignores invalid events served by a malicious relay", async () => {
  const key = uniqueKey("evil");
  const aliceKey = `:${Alice.userAccount.getAddress()}.${key}`;
  const event = (d: string, content: string) =>
    finalizeEvent(
      {
        kind: VALUE_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", d]],
        content,
      },
      generateSecretKey()
    );

  // Valid signatures, but for a namespace the author does not own, for
  // another key, and with a value that is not JSON
  const served = [
    event(`${TOPIC}:${aliceKey}`, JSON.stringify("not alice")),
    event(`${TOPIC}:another-key`, JSON.stringify("wrong key")),
    event(`${TOPIC}:${aliceKey}`, "not json"),
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
    expect(await victim.getData(aliceKey)).toBeNull();
  } finally {
    await victim.close();
    evil.clients.forEach((socket) => socket.terminate());
    await new Promise((resolve) => evil.close(resolve));
  }
});
