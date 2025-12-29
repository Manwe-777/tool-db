import { ToolDb, textRandom } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

// Tests for the ToolDb lifecycle API (ready and close)
jest.setTimeout(15000);

describe("ToolDb Lifecycle API", () => {
  let db: ToolDb;
  let dbStorageName: string;

  beforeEach(async () => {
    // Create a unique storage name for each test to avoid conflicts
    dbStorageName = ".test-db/test-lifecycle-" + textRandom(8);
    db = new ToolDb({
      server: false,
      peers: [],
      storageName: dbStorageName,
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebsockets,
      userAdapter: ToolDbWeb3,
      pow: null, // Bypass POW for faster tests
    });
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it("should have a ready promise that resolves after initialization", async () => {
    const readyPromise = db.ready;
    expect(readyPromise).toBeInstanceOf(Promise);

    // Should resolve without error
    await expect(readyPromise).resolves.toBeUndefined();

    // After ready, network should be accessible
    expect(db.network).toBeDefined();
  });

  it("should emit init event after ready resolves", async () => {
    const initPromise = new Promise<string>((resolve) => {
      db.once("init", (address) => {
        resolve(address);
      });
    });

    await db.ready;

    const address = await Promise.race([
      initPromise,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Init event not emitted")), 2000)
      ),
    ]);

    expect(address).toBeDefined();
    expect(typeof address).toBe("string");
  });

  it("should allow multiple calls to ready to return the same promise", async () => {
    const ready1 = db.ready;
    const ready2 = db.ready;

    expect(ready1).toBe(ready2);

    await Promise.all([ready1, ready2]);
  });

  it("should properly close stores when close() is called", async () => {
    await db.ready;

    // Verify stores exist
    expect(db.store).toBeDefined();
    expect((db as any)._peerStore).toBeDefined();

    // Close should complete without error
    await expect(db.close()).resolves.toBeUndefined();

    // After closing, attempting to use store might fail, but close itself should succeed
    // (We can't easily test this without trying to use the store, which might throw)
  });

  it("should handle close() being called multiple times gracefully", async () => {
    await db.ready;

    // Multiple closes should not throw
    await expect(Promise.all([db.close(), db.close(), db.close()])).resolves
      .toBeDefined();
  });

  it("should allow operations after ready resolves", async () => {
    await db.ready;

    // Should be able to access network
    expect(db.network).toBeDefined();

    // Should be able to access store
    expect(db.store).toBeDefined();

    // Should be able to access user account
    expect(db.userAccount).toBeDefined();

    // Should be able to access peer account
    expect(db.peerAccount).toBeDefined();
  });

  it("should initialize user account correctly", async () => {
    await db.ready;

    // User account should have an address after initialization
    const address = db.userAccount.getAddress();
    expect(address).toBeDefined();
    expect(typeof address).toBe("string");
  });

  it("should initialize peer account correctly", async () => {
    await db.ready;

    // Peer account should have an address after initialization
    const address = db.peerAccount.getAddress();
    expect(address).toBeDefined();
    expect(typeof address).toBe("string");
  });

  it("should work with signup after ready", async () => {
    await db.ready;

    const username = "lifecycle-user-" + textRandom(12);
    const password = "test-password";

    // Signup should work after ready
    const result = await db.signUp(username, password);
    expect(result).toBeDefined();
    expect(result.type).toBe("put");
    expect(result.data.k).toBe(`==${username}`);
  });
});

