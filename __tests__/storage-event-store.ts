import {
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  StorageContext,
  textRandom,
  ToolDbStorageAdapter,
  ToolDbMemoryStore,
} from "../packages/tool-db";

import { StorageEventStore } from "../packages/nostr-relay";
import ToolDbLeveldb from "../packages/leveldb-store";

jest.setTimeout(15000);

const context = (storageName: string): StorageContext => ({
  options: { storageName },
  logger: () => undefined,
});

const now = () => Math.floor(Date.now() / 1000);

const sign = (
  template: Partial<EventTemplate>,
  secretKey = generateSecretKey()
) =>
  finalizeEvent(
    { kind: 1, created_at: now(), tags: [], content: "", ...template },
    secretKey
  );

const adapters: [string, () => ToolDbStorageAdapter][] = [
  ["memory", () => new ToolDbMemoryStore(context("memory"))],
  [
    "leveldb",
    () =>
      new ToolDbLeveldb(context(".test-db/test-event-store-" + textRandom(8))),
  ],
];

describe.each(adapters)("StorageEventStore on %s", (_name, createAdapter) => {
  let adapter: ToolDbStorageAdapter;
  let store: StorageEventStore;

  beforeEach(async () => {
    adapter = createAdapter();
    await adapter.ready;
    store = new StorageEventStore(adapter);
  });

  afterEach(async () => {
    if (typeof (adapter as any).close === "function") {
      await (adapter as any).close();
    }
  });

  it("Stores events and rejects duplicates", async () => {
    const event = sign({ content: "hello" });
    expect(await store.add(event)).toBe(true);
    expect(await store.add(event)).toBe(false);
    expect(await store.query([{ ids: [event.id] }])).toEqual([event]);
  });

  it("Does not store ephemeral events", async () => {
    const event = sign({ kind: 20000 });
    expect(await store.add(event)).toBe(true);
    expect(await store.query([{ kinds: [20000] }])).toEqual([]);
  });

  it("Replaces addressable events, and removes them from the indexes", async () => {
    const key = generateSecretKey();
    const tags = [["d", "store-key"]];
    const older = sign(
      { kind: 30078, created_at: now() - 10, tags, content: "old" },
      key
    );
    const newer = sign(
      { kind: 30078, created_at: now(), tags, content: "new" },
      key
    );

    await store.add(older);
    await store.add(newer);
    expect(await store.add(older)).toBe(false);

    expect(await store.query([{ "#d": ["store-key"] }])).toEqual([newer]);
    expect(await store.query([{ kinds: [30078] }])).toEqual([newer]);
    expect(await store.query([{ ids: [older.id] }])).toEqual([]);
    // Nothing left of the old event: only the new one and its indexes
    // (all, kind, author and d tag)
    expect((await adapter.query("e/")).length).toBe(1);
    const indexes = await adapter.query("i/");
    expect(indexes.length).toBe(4);
    expect(indexes.every((key) => key.endsWith(newer.id))).toBe(true);
  });

  it("Keeps addressable events of different authors", async () => {
    const tags = [["d", "shared"]];
    const a = sign({ kind: 30078, tags });
    const b = sign({ kind: 30078, tags });
    await store.add(a);
    await store.add(b);
    expect((await store.query([{ "#d": ["shared"] }])).length).toBe(2);
  });

  it("Queries by kind, author, tag and time, newest first", async () => {
    const key = generateSecretKey();
    const events = [3, 2, 1].map((age) =>
      sign({ created_at: now() - age, tags: [["t", "store-query"]] }, key)
    );
    const other = sign({ kind: 2, tags: [["t", "store-query"]] });
    for (const event of [...events, other]) await store.add(event);

    const ids = (filters: object[]) =>
      store.query(filters as any).then((found) => found.map((e) => e.id));

    expect(await ids([{ "#t": ["store-query"], kinds: [1] }])).toEqual(
      [...events].reverse().map((e) => e.id)
    );
    expect(await ids([{ authors: [events[0].pubkey], limit: 2 }])).toEqual([
      events[2].id,
      events[1].id,
    ]);
    expect(
      await ids([{ "#t": ["store-query"], since: now() - 2, until: now() - 2 }])
    ).toEqual([events[1].id]);
    expect(await ids([{ kinds: [2] }, { ids: [events[0].id] }])).toEqual([
      other.id,
      events[0].id,
    ]);
  });

  it("Matches tag values with special characters exactly", async () => {
    const a = sign({ tags: [["d", "a/b ñ~*"]] });
    const b = sign({ tags: [["d", "a/b"]] });
    await store.add(a);
    await store.add(b);

    expect(await store.query([{ "#d": ["a/b"] }])).toEqual([b]);
    expect(await store.query([{ "#d": ["a/b ñ~*"] }])).toEqual([a]);
  });
});

it("Keeps events in LevelDB across restarts", async () => {
  const name = ".test-db/test-event-store-restart-" + textRandom(8);
  const event = sign({ tags: [["t", "restart"]] });

  const first = new ToolDbLeveldb(context(name));
  await new StorageEventStore(first).add(event);
  await first.close();

  const second = new ToolDbLeveldb(context(name));
  expect(
    await new StorageEventStore(second).query([{ "#t": ["restart"] }])
  ).toEqual([event]);
  await second.close();
});
