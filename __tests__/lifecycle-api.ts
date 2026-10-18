import { ToolDb, textRandom } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";

// Tests for the ToolDb lifecycle API (ready and close)
jest.setTimeout(15000);

describe("ToolDb Lifecycle API", () => {
  let db: ToolDb;

  beforeEach(() => {
    // A unique storage name for each test to avoid conflicts
    db = new ToolDb({
      storageName: ".test-db/test-lifecycle-" + textRandom(8),
      storageAdapter: ToolDbLeveldb,
    });
  });

  afterEach(() => db.close());

  it("Has a ready promise that resolves after initialization", async () => {
    expect(db.ready).toBeInstanceOf(Promise);
    await expect(db.ready).resolves.toBeUndefined();
  });

  it("Emits the init event with our address", async () => {
    const address = new Promise<string>((resolve) => db.once("init", resolve));
    await db.ready;
    expect(await address).toBe(db.userAccount.getAddress());
  });

  it("Returns the same ready promise every time", () => {
    expect(db.ready).toBe(db.ready);
  });

  it("Can be closed more than once", async () => {
    await db.close();
    await expect(db.close()).resolves.toBeUndefined();
  });

  it("Has a usable identity right away", () => {
    expect(db.userAccount.getAddress()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("Can switch to a new anonymous identity", async () => {
    const first = db.userAccount.getAddress();
    await db.anonSignIn();
    expect(db.userAccount.getAddress()).not.toBe(first);
  });

  it("Works offline after ready", async () => {
    await db.ready;
    await db.putData("lifecycle-key", "value");
    expect(await db.getData("lifecycle-key")).toBe("value");
  });

  it("Is not connected without relays", async () => {
    await db.ready;
    expect(db.isConnected).toBe(false);
  });
});
