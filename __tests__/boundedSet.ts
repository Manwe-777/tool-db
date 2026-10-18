import { BoundedSet, PutMessage, ToolDb } from "../packages/tool-db";

it("Remembers only the latest items", () => {
  const set = new BoundedSet<string>(3);
  ["a", "b", "c", "d"].forEach((item) => set.add(item));

  expect(set.size).toBe(3);
  expect(set.has("a")).toBeFalsy();
  expect(set.has("b")).toBeTruthy();
  expect(set.has("d")).toBeTruthy();
});

it("Does not evict when adding an existing item", () => {
  const set = new BoundedSet<string>(2);
  set.add("a");
  set.add("b");
  set.add("a");

  expect(set.size).toBe(2);
  expect(set.has("a")).toBeTruthy();
  expect(set.has("b")).toBeTruthy();
});

describe("Outgoing message deduplication", () => {
  const putMessage = (hash: string): PutMessage => ({
    type: "put",
    id: hash,
    to: [],
    data: { k: "key", a: "", n: 0, h: hash, t: 0, s: "", v: "", c: null },
  });

  it("Sends the same data only once per client", () => {
    const db = new ToolDb();
    const sent: string[] = [];
    db.network.clientToSend["peer"] = (msg) => sent.push(msg);

    db.network.sendToClientId("peer", putMessage("hash-a"));
    db.network.sendToClientId("peer", putMessage("hash-a"));
    db.network.sendToClientId("peer", putMessage("hash-b"));

    expect(sent.length).toBe(2);
  });

  it("Does not throw when sending to a disconnected client", () => {
    const db = new ToolDb();
    const sent: string[] = [];
    db.network.clientToSend["peer"] = (msg) => sent.push(msg);

    db.network.sendToClientId("peer", putMessage("hash-a"));
    db.network.onClientDisconnect("peer");

    expect(db.processedOutHashes["peer"]).toBeUndefined();
    expect(() =>
      db.network.sendToClientId("peer", putMessage("hash-b"))
    ).not.toThrow();
    expect(sent.length).toBe(1);
  });
});
