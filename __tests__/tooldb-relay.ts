import http from "http";
import WebSocket from "ws";

import {
  CRDT_EVENT_KIND,
  CRDT_MAP,
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  MapCrdt,
  NostrEvent,
  textRandom,
  ToolDb,
  VALUE_KIND,
} from "../packages/tool-db";

import { ToolDbRelay } from "../packages/nostr-relay";
import ToolDbLeveldb from "../packages/leveldb-store";

import MemoryStore from "../test-utils/memoryStore";

jest.setTimeout(15000);

const TOPIC = "tooldb-relay-test";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const now = () => Math.floor(Date.now() / 1000);

const uniqueKey = (name: string) => `${name}-${textRandom(10)}`;

const createClient = async (
  relay: ToolDbRelay,
  functionServers: string[] = []
) => {
  const db = new ToolDb({
    relays: [relay.url],
    storageAdapter: MemoryStore,
    topic: TOPIC,
    functionServers,
  });
  await db.ready;
  if (!db.isConnected) {
    await new Promise<void>((resolve) => {
      db.onConnect = () => resolve();
    });
  }
  return db;
};

/**
 * Publishes an event directly, returning the OK message of the relay
 */
const publish = async (relay: ToolDbRelay, event: NostrEvent) => {
  const socket = new WebSocket(relay.url);
  await new Promise((resolve) => socket.once("open", resolve));
  const reply = new Promise<any[]>((resolve) =>
    socket.once("message", (data) => resolve(JSON.parse(data.toString())))
  );
  socket.send(JSON.stringify(["EVENT", event]));
  const result = await reply;
  socket.close();
  return result;
};

const sign = (
  template: Partial<EventTemplate>,
  secretKey = generateSecretKey()
) =>
  finalizeEvent(
    { kind: 1, created_at: now(), tags: [], content: "", ...template },
    secretKey
  );

const valueEvent = (key: string, value: unknown, secretKey?: string) =>
  sign(
    {
      kind: VALUE_KIND,
      tags: [["d", `${TOPIC}:${key}`]],
      content: JSON.stringify(value),
    },
    secretKey
  );

let relay: ToolDbRelay;
const clients: ToolDb[] = [];

beforeAll(async () => {
  relay = new ToolDbRelay({ topic: TOPIC });
  relay.addServerFunction<number, { a: number; b: number }>(
    "add",
    async ({ a, b }) => {
      if (typeof a !== "number" || typeof b !== "number") {
        throw new Error("Invalid arguments");
      }
      return a + b;
    }
  );
  relay.addServerFunction<string>("whoami", async (_args, caller) => caller);
  await relay.start();
});

afterAll(async () => {
  await Promise.all(clients.map((db) => db.close()));
  await relay.close();
});

it("Serves its information document with its public key (NIP-11)", async () => {
  const info = await new Promise<any>((resolve, reject) => {
    http
      .get(
        `http://127.0.0.1:${relay.port}`,
        { headers: { Accept: "application/nostr+json" } },
        (response) => {
          let body = "";
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () =>
            resolve({ headers: response.headers, body })
          );
        }
      )
      .on("error", reject);
  });

  expect(info.headers["access-control-allow-origin"]).toBe("*");
  const document = JSON.parse(info.body);
  expect(document.pubkey).toBe(relay.pubkey);
  expect(document.supported_nips).toEqual([1, 11]);
});

it("Accepts valid ToolDB data of its topic", async () => {
  const result = await publish(relay, valueEvent(uniqueKey("valid"), "value"));
  expect(result[2]).toBe(true);
});

it("Rejects writes to a user namespace from other users", async () => {
  const owner = getPublicKey(generateSecretKey());
  const result = await publish(
    relay,
    valueEvent(`:${owner}.${uniqueKey("namespace")}`, "not yours")
  );
  expect(result.slice(2)).toEqual([false, "blocked: AddressMismatch"]);
});

it("Rejects CRDT changes attributed to another author", async () => {
  const someoneElse = getPublicKey(generateSecretKey());
  const event = sign({
    kind: CRDT_EVENT_KIND,
    tags: [
      ["k", `${TOPIC}:${uniqueKey("crdt")}`],
      ["c", CRDT_MAP],
    ],
    content: JSON.stringify([
      { t: "SET", k: "x", a: someoneElse, v: "forged", i: 1 },
    ]),
  });

  const result = await publish(relay, event);
  expect(result.slice(2)).toEqual([false, "blocked: AddressMismatch"]);
});

it("Rejects values that are not JSON", async () => {
  const event = sign({
    kind: VALUE_KIND,
    tags: [["d", `${TOPIC}:${uniqueKey("json")}`]],
    content: "not json",
  });
  expect((await publish(relay, event)).slice(2)).toEqual([
    false,
    "blocked: InvalidData",
  ]);
});

it("Rejects events that are not ToolDB data of its topic", async () => {
  const note = sign({ kind: 1, content: "hello" });
  expect((await publish(relay, note))[2]).toBe(false);

  const otherTopic = sign({
    kind: VALUE_KIND,
    tags: [["d", "other-topic:key"]],
    content: "1",
  });
  expect((await publish(relay, otherTopic))[2]).toBe(false);
});

it("Can accept other events, like a regular relay", async () => {
  const open = new ToolDbRelay({ topic: TOPIC, acceptForeignEvents: true });
  await open.start();
  expect((await publish(open, sign({ kind: 1, content: "hello" })))[2]).toBe(
    true
  );
  await open.close();
});

it("Applies its custom verificators", async () => {
  const key = uniqueKey("custom");
  const id = relay.addCustomVerification(key, async (msg, previous) => {
    // Values can only grow
    return typeof msg.v === "number" && (!previous || msg.v > previous.v);
  });

  const secretKey = generateSecretKey();
  const first = sign(
    {
      kind: VALUE_KIND,
      created_at: now() - 1,
      tags: [["d", `${TOPIC}:${key}`]],
      content: "5",
    },
    secretKey
  );
  expect((await publish(relay, first))[2]).toBe(true);
  expect((await publish(relay, valueEvent(key, 3)))[2]).toBe(false);
  expect((await publish(relay, valueEvent(key, 6)))[2]).toBe(true);

  relay.removeCustomVerification(id);
});

describe("Server functions", () => {
  let client: ToolDb;

  beforeAll(async () => {
    client = await createClient(relay, [relay.pubkey]);
    clients.push(client);
  });

  it("Runs functions and returns their result", async () => {
    expect(await client.doFunction("add", { a: 2, b: 3 })).toEqual({
      code: "OK",
      return: 5,
    });
  });

  it("Gives functions the public key of the caller", async () => {
    expect(await client.doFunction("whoami", null)).toEqual({
      code: "OK",
      return: client.userAccount.getAddress(),
    });
  });

  it("Returns errors thrown by functions", async () => {
    expect(await client.doFunction("add", { a: "2" })).toEqual({
      code: "ERR",
      return: "Invalid arguments",
    });
  });

  it("Reports functions that do not exist", async () => {
    const result = await client.doFunction("missing", {});
    expect(result.code).toBe("NOT_FOUND");
  });

  it("Does not run on servers that are not trusted", async () => {
    const untrusted = await createClient(relay, [
      getPublicKey(generateSecretKey()),
    ]);
    clients.push(untrusted);
    const result = await untrusted.doFunction(
      "add",
      { a: 1, b: 1 },
      { timeoutMs: 500 }
    );
    expect(result).toEqual({
      code: "ERR",
      return: "No server answered in time",
    });
  });

  it("Needs function servers to be configured", async () => {
    const noServers = await createClient(relay);
    clients.push(noServers);
    expect((await noServers.doFunction("add", { a: 1, b: 1 })).code).toBe(
      "ERR"
    );
  });
});

it("Keeps the data of its clients across restarts", async () => {
  const storageName = ".test-db/test-tooldb-relay-" + textRandom(8);
  const options = {
    topic: TOPIC,
    storageAdapter: ToolDbLeveldb,
    storageName,
  };

  const node = new ToolDbRelay(options);
  await node.start();
  const { port } = node;
  const alice = await createClient(node);

  const key = uniqueKey("persisted");
  await alice.putData(key, { saved: true });
  const map = new MapCrdt<string>(alice.userAccount.getAddress() || "");
  map.SET("a", "1");
  await alice.putCrdt(key + "-crdt", map);
  await wait(200);
  await alice.close();
  await node.close();

  // The node restarts on the same port, with the same storage
  const restarted = new ToolDbRelay({ ...options, port });
  await restarted.start();
  const bob = await createClient(restarted);

  expect(await bob.getData(key)).toEqual({ saved: true });
  const bobMap = new MapCrdt<string>(bob.userAccount.getAddress() || "");
  await bob.getCrdt(key + "-crdt", bobMap);
  expect(bobMap.value).toEqual({ a: "1" });

  await bob.close();
  await restarted.close();
});
