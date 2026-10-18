import WebSocket from "ws";

import {
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  matchFilter,
  NostrEvent,
} from "../packages/tool-db";

import NostrRelay from "../packages/nostr-relay";

jest.setTimeout(10000);

let relay: NostrRelay;

beforeAll(async () => {
  relay = new NostrRelay();
  await relay.start();
});

afterAll(() => relay.close());

/**
 * A minimal client that records every message it receives
 */
const connect = async () => {
  const socket = new WebSocket(relay.url);
  const messages: any[] = [];
  socket.on("message", (data) => messages.push(JSON.parse(data.toString())));
  await new Promise((resolve) => socket.once("open", resolve));

  const waitFor = async (predicate: (message: any) => boolean) => {
    for (let i = 0; i < 100; i += 1) {
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Message not received");
  };

  return {
    messages,
    send: (message: unknown[]) => socket.send(JSON.stringify(message)),
    waitFor,
    publish: async (event: NostrEvent) => {
      socket.send(JSON.stringify(["EVENT", event]));
      return waitFor((m) => m[0] === "OK" && m[1] === event.id);
    },
    query: async (subId: string, ...filters: object[]) => {
      socket.send(JSON.stringify(["REQ", subId, ...filters]));
      await waitFor((m) => m[0] === "EOSE" && m[1] === subId);
      return messages
        .filter((m) => m[0] === "EVENT" && m[1] === subId)
        .map((m) => m[2] as NostrEvent);
    },
    close: () => socket.close(),
  };
};

const now = () => Math.floor(Date.now() / 1000);

const sign = (
  template: Partial<EventTemplate>,
  secretKey = generateSecretKey()
) =>
  finalizeEvent(
    { kind: 1, created_at: now(), tags: [], content: "", ...template },
    secretKey
  );

it("Stores and serves events", async () => {
  const client = await connect();
  const event = sign({ content: "hello", tags: [["t", "relay-store"]] });

  expect(await client.publish(event)).toEqual(["OK", event.id, true, ""]);
  expect(await client.query("s1", { "#t": ["relay-store"] })).toEqual([event]);
  client.close();
});

it("Rejects invalid events", async () => {
  const client = await connect();
  const event = sign({ content: "hello" });

  const tampered = await client.publish({ ...event, content: "tampered" });
  expect(tampered[2]).toBe(false);

  const future = sign({ created_at: now() + 3600 });
  expect((await client.publish(future))[2]).toBe(false);
  client.close();
});

it("Reports duplicates", async () => {
  const client = await connect();
  const event = sign({ content: "dup" });

  await client.publish(event);
  client.messages.length = 0;
  const second = await client.publish(event);
  expect(second[2]).toBe(true);
  expect(second[3]).toMatch(/^duplicate:/);
  client.close();
});

it("Keeps only the latest addressable event per author and d tag", async () => {
  const client = await connect();
  const key = generateSecretKey();
  const tags = [["d", "relay-addressable"]];

  const older = sign({ kind: 30078, created_at: now() - 10, tags }, key);
  const newer = sign({ kind: 30078, created_at: now(), tags }, key);
  const otherAuthor = sign({ kind: 30078, created_at: now() - 20, tags });

  await client.publish(newer);
  await client.publish(older);
  await client.publish(otherAuthor);

  const events = await client.query("s2", { "#d": ["relay-addressable"] });
  expect(events.map((e) => e.id).sort()).toEqual(
    [newer.id, otherAuthor.id].sort()
  );
  client.close();
});

it("Breaks replaceable ties by lowest id", async () => {
  const client = await connect();
  const key = generateSecretKey();
  const created_at = now();

  const a = sign({ kind: 10078, created_at, content: "a" }, key);
  const b = sign({ kind: 10078, created_at, content: "b" }, key);
  const [lowest, highest] = a.id < b.id ? [a, b] : [b, a];

  await client.publish(lowest);
  await client.publish(highest);

  const events = await client.query("s3", {
    kinds: [10078],
    authors: [lowest.pubkey],
  });
  expect(events).toEqual([lowest]);
  client.close();
});

it("Does not store ephemeral events, but forwards them", async () => {
  const listener = await connect();
  const sender = await connect();
  await listener.query("live", { kinds: [20078] });

  const event = sign({ kind: 20078, content: "ephemeral" });
  await sender.publish(event);

  const live = await listener.waitFor(
    (m) => m[0] === "EVENT" && m[1] === "live"
  );
  expect(live[2]).toEqual(event);
  expect(await sender.query("s4", { kinds: [20078] })).toEqual([]);
  listener.close();
  sender.close();
});

it("Sends new events to open subscriptions until closed", async () => {
  const listener = await connect();
  const sender = await connect();
  await listener.query("sub", { "#t": ["relay-live"] });

  const first = sign({ tags: [["t", "relay-live"]], content: "1" });
  await sender.publish(first);
  await listener.waitFor((m) => m[0] === "EVENT" && m[2].id === first.id);

  listener.send(["CLOSE", "sub"]);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const second = sign({ tags: [["t", "relay-live"]], content: "2" });
  await sender.publish(second);
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(listener.messages.some((m) => m[2]?.id === second.id)).toBe(false);
  listener.close();
  sender.close();
});

it("Applies filter limits, newest first", async () => {
  const client = await connect();
  const tags = [["t", "relay-limit"]];
  const events = [3, 2, 1].map((age) =>
    sign({ tags, created_at: now() - age })
  );
  for (const event of events) await client.publish(event);

  const result = await client.query("s5", { "#t": ["relay-limit"], limit: 2 });
  expect(result.map((e) => e.id)).toEqual([events[2].id, events[1].id]);
  client.close();
});

it("Can reject events with custom validation", async () => {
  const strict = new NostrRelay({
    acceptEvent: (event) => event.content === "allowed" || "not allowed",
  });
  await strict.start();

  const socket = new WebSocket(strict.url);
  await new Promise((resolve) => socket.once("open", resolve));
  const reply = new Promise<any>((resolve) =>
    socket.once("message", (data) => resolve(JSON.parse(data.toString())))
  );
  socket.send(JSON.stringify(["EVENT", sign({ content: "nope" })]));

  expect((await reply).slice(2)).toEqual([false, "blocked: not allowed"]);
  socket.close();
  await strict.close();
});

it("Matches filters like NIP-01", () => {
  const event = sign({
    kind: 30078,
    created_at: 1000,
    tags: [
      ["d", "key"],
      ["t", "topic"],
    ],
  });

  expect(matchFilter({ kinds: [30078], "#d": ["key"] }, event)).toBe(true);
  expect(matchFilter({ "#d": ["other"] }, event)).toBe(false);
  expect(matchFilter({ "#d": ["key"], "#t": ["other"] }, event)).toBe(false);
  expect(
    matchFilter({ authors: [event.pubkey], since: 1000, until: 1000 }, event)
  ).toBe(true);
  expect(matchFilter({ since: 1001 }, event)).toBe(false);
  expect(matchFilter({ ids: ["x"] }, event)).toBe(false);
});
