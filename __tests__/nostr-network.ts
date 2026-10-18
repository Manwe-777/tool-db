import WebSocket, { WebSocketServer } from "ws";

import {
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  ToolDb,
} from "../packages/tool-db";

import NostrRelay from "../packages/nostr-relay";
import ToolDbNostrNetwork, { RelayPool } from "../packages/nostr-network";

jest.setTimeout(15000);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const now = () => Math.floor(Date.now() / 1000);

const sign = (template: Partial<EventTemplate>) =>
  finalizeEvent(
    { kind: 1, created_at: now(), tags: [], content: "", ...template },
    generateSecretKey()
  );

const waitUntil = async (condition: () => boolean, timeoutMs = 3000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timed out");
    await wait(10);
  }
};

let relayA: NostrRelay;
let relayB: NostrRelay;

beforeEach(async () => {
  relayA = new NostrRelay();
  relayB = new NostrRelay();
  await Promise.all([relayA.start(), relayB.start()]);
});

afterEach(async () => {
  await Promise.all([relayA.close(), relayB.close()]);
});

const createPool = async (urls: string[]) => {
  const pool = new RelayPool(urls, {
    WebSocket: WebSocket as any,
    minRetryMs: 50,
  });
  await waitUntil(() => pool.connected === urls.length);
  return pool;
};

it("Publishes to every relay", async () => {
  const pool = await createPool([relayA.url, relayB.url]);
  const event = sign({ content: "hello" });

  const result = await pool.publish(event);
  expect(result.accepted.sort()).toEqual([relayA.url, relayB.url].sort());
  expect(result.rejected).toEqual([]);
  pool.close();
});

it("Reports relays that reject an event", async () => {
  const strict = new NostrRelay({ acceptEvent: () => "no thanks" });
  await strict.start();
  const pool = await createPool([relayA.url, strict.url]);

  const result = await pool.publish(sign({}));
  expect(result.accepted).toEqual([relayA.url]);
  expect(result.rejected).toEqual([
    { url: strict.url, reason: "blocked: no thanks" },
  ]);
  pool.close();
  await strict.close();
});

it("Queries every relay and merges the results without duplicates", async () => {
  const onlyA = sign({ tags: [["t", "pool-query"]], content: "a" });
  const onlyB = sign({ tags: [["t", "pool-query"]], content: "b" });
  const both = sign({ tags: [["t", "pool-query"]], content: "both" });

  const poolA = await createPool([relayA.url]);
  const poolB = await createPool([relayB.url]);
  await poolA.publish(onlyA);
  await poolB.publish(onlyB);
  await poolA.publish(both);
  await poolB.publish(both);

  const pool = await createPool([relayA.url, relayB.url]);
  const events = await pool.query([{ "#t": ["pool-query"] }]);
  expect(events.map((e) => e.id).sort()).toEqual(
    [onlyA.id, onlyB.id, both.id].sort()
  );
  [pool, poolA, poolB].forEach((p) => p.close());
});

it("Receives live events from subscriptions", async () => {
  const listener = await createPool([relayA.url, relayB.url]);
  const sender = await createPool([relayA.url, relayB.url]);

  const received: string[] = [];
  const close = listener.subscribe([{ "#t": ["pool-live"] }], (event) =>
    received.push(event.id)
  );
  await wait(50);

  const event = sign({ tags: [["t", "pool-live"]] });
  await sender.publish(event);
  await waitUntil(() => received.length > 0);
  await wait(50);

  // Sent by both relays, received once
  expect(received).toEqual([event.id]);
  close();
  listener.close();
  sender.close();
});

it("Drops forged events from a malicious relay", async () => {
  const valid = sign({ tags: [["t", "pool-forged"]], content: "valid" });

  // A relay that answers every request with a tampered and a valid event
  const evil = new WebSocketServer({ port: 0 });
  await new Promise((resolve) => evil.once("listening", resolve));
  evil.on("connection", (socket) => {
    socket.on("message", (data) => {
      const [type, subId] = JSON.parse(data.toString());
      if (type !== "REQ") return;
      socket.send(
        JSON.stringify(["EVENT", subId, { ...valid, content: "forged" }])
      );
      socket.send(JSON.stringify(["EVENT", subId, valid]));
      socket.send(JSON.stringify(["EOSE", subId]));
    });
  });
  const evilUrl = `ws://127.0.0.1:${(evil.address() as any).port}`;

  const pool = await createPool([evilUrl]);
  const events = await pool.query([{ "#t": ["pool-forged"] }]);
  expect(events).toEqual([valid]);

  pool.close();
  evil.clients.forEach((socket) => socket.terminate());
  await new Promise((resolve) => evil.close(resolve));
});

it("Does not wait for relays that are offline", async () => {
  const offline = "ws://127.0.0.1:1";
  const pool = new RelayPool([relayA.url, offline], {
    WebSocket: WebSocket as any,
  });
  await waitUntil(() => pool.connected === 1);

  const start = Date.now();
  await pool.query([{ "#t": ["pool-offline"] }], 3000);
  expect(Date.now() - start).toBeLessThan(1000);
  pool.close();
});

it("Restores subscriptions after reconnecting", async () => {
  const port = relayA.port;
  const listener = await createPool([relayA.url]);

  const received: string[] = [];
  listener.subscribe([{ "#t": ["pool-reconnect"] }], (event) =>
    received.push(event.id)
  );
  await wait(50);

  // The relay restarts on the same port
  await relayA.close();
  await waitUntil(() => listener.connected === 0);
  relayA = new NostrRelay({ port });
  await relayA.start();
  await waitUntil(() => listener.connected === 1, 5000);
  await wait(50);

  const sender = await createPool([relayA.url]);
  const event = sign({ tags: [["t", "pool-reconnect"]] });
  await sender.publish(event);
  await waitUntil(() => received.includes(event.id));

  listener.close();
  sender.close();
});

it("Reports the connection status to the database", async () => {
  const db = new ToolDb({
    networkAdapter: ToolDbNostrNetwork,
    relays: [relayA.url],
  });

  await new Promise<void>((resolve) => {
    db.onConnect = () => resolve();
  });
  expect(db.isConnected).toBe(true);

  const disconnected = new Promise<void>((resolve) => {
    db.onDisconnect = () => resolve();
  });
  await relayA.close();
  await disconnected;
  expect(db.isConnected).toBe(false);

  await db.close();
});
