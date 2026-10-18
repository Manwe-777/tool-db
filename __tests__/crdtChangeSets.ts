import {
  CRDT_LIST,
  CRDT_MAP,
  getChangeAuthor,
  getChangeSetHash,
  ListCrdt,
  MapCrdt,
  mergeChangeSets,
  SignedChangeSet,
  ToolDb,
  ToolDbStorageAdapter,
  verifyChangeSet,
  VerifyResult,
} from "../packages/tool-db";

import ToolDbWeb3 from "../packages/web3-user";

class MemoryStore extends ToolDbStorageAdapter {
  private data: Record<string, string> = {};

  put(key: string, data: string) {
    this.data[key] = data;
    return Promise.resolve(true);
  }

  get(key: string) {
    return key in this.data
      ? Promise.resolve(this.data[key])
      : Promise.reject(new Error("Not found"));
  }
}

let db: ToolDb;
let address: string;

beforeAll(async () => {
  db = new ToolDb({ userAdapter: ToolDbWeb3, storageAdapter: MemoryStore });
  await db.ready;
  await db.anonSignIn();
  address = db.userAccount.getAddress() || "";
});

const signSet = async (
  key: string,
  changes: any[],
  t = Date.now()
): Promise<SignedChangeSet> => {
  const set = { a: address, t, c: changes };
  const s = await db.userAccount.signData(getChangeSetHash(key, CRDT_MAP, set));
  return { ...set, s };
};

const setChange = (k: string, v: string, i = 1) => ({
  t: "SET",
  k,
  a: address,
  v,
  i,
});

it("Verifies a valid change set", async () => {
  const set = await signSet("doc", [setChange("key", "value")]);
  expect(await verifyChangeSet(db, "doc", CRDT_MAP, set)).toBe(
    VerifyResult.Verified
  );
});

it("Can not replay a change set into another document", async () => {
  const set = await signSet("doc", [setChange("key", "value")]);
  expect(await verifyChangeSet(db, "other-doc", CRDT_MAP, set)).toBe(
    VerifyResult.InvalidSignature
  );
});

it("Can not tamper with a change set", async () => {
  const set = await signSet("doc", [setChange("key", "value")]);
  set.c[0].v = "tampered";
  expect(await verifyChangeSet(db, "doc", CRDT_MAP, set)).toBe(
    VerifyResult.InvalidSignature
  );
});

it("Rejects malformed changes", async () => {
  const set = await signSet("doc", [{ t: "SET", a: address }]);
  expect(await verifyChangeSet(db, "doc", CRDT_MAP, set)).toBe(
    VerifyResult.InvalidData
  );
});

it("Rejects change sets from the future", async () => {
  const set = await signSet(
    "doc",
    [setChange("key", "value")],
    Date.now() + 60000
  );
  expect(await verifyChangeSet(db, "doc", CRDT_MAP, set)).toBe(
    VerifyResult.InvalidTimestamp
  );
});

it("Runs custom verificators with the changes and their author", async () => {
  let received: any;
  const id = db.addCustomVerification("custom-doc", async (msg) => {
    received = msg;
    return msg.v.every((change: any) => change.t !== "DEL");
  });

  const valid = await signSet("custom-doc", [setChange("key", "value")]);
  expect(await verifyChangeSet(db, "custom-doc", CRDT_MAP, valid)).toBe(
    VerifyResult.Verified
  );
  expect(received.a).toBe(address);
  expect(received.v).toEqual(valid.c);

  const del = await signSet("custom-doc", [
    { t: "DEL", k: "key", a: address, i: 2 },
  ]);
  expect(await verifyChangeSet(db, "custom-doc", CRDT_MAP, del)).toBe(
    VerifyResult.CustomVerificationFailed
  );

  db.removeCustomVerification(id);
});

it("Gets the author of list changes from their index", () => {
  const list = new ListCrdt<string>(address);
  list.PUSH("item");
  expect(getChangeAuthor(CRDT_LIST, list.getChanges()[0])).toBe(address);
  expect(getChangeAuthor(CRDT_LIST, { t: "INS", i: "no-sequence" })).toBe("no");
  expect(getChangeAuthor(CRDT_LIST, { t: "INS", i: "nosequence" })).toBe(
    undefined
  );
});

it("Merges change sets without duplicates", async () => {
  const a = await signSet("doc", [setChange("a", "1")]);
  const b = await signSet("doc", [setChange("b", "2")]);

  const merged = mergeChangeSets("doc", CRDT_MAP, [a], [a, b]);
  expect(merged.added).toBe(1);
  expect(merged.sets).toEqual([a, b]);
});

it("Only publishes our own changes, once", async () => {
  const map = new MapCrdt<string>(address);
  map.SET("ours", "value");
  // A change from someone else, we can not sign it for them
  map.mergeChanges([
    { t: "SET", k: "theirs", a: "someone-else", v: "x", i: 1 },
  ]);

  const first = await db.putCrdt("own-changes", map);
  expect(first?.data.sets.length).toBe(1);
  expect(first?.data.sets[0].c).toEqual([setChange("ours", "value")]);

  // Nothing new to publish, the same change set is sent again
  const second = await db.putCrdt("own-changes", map);
  expect(second?.data.sets.length).toBe(1);

  map.SET("ours", "updated");
  const third = await db.putCrdt("own-changes", map);
  expect(third?.data.sets.length).toBe(2);
  expect(third?.data.sets[1].c).toEqual([setChange("ours", "updated", 2)]);
});
