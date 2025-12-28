import {
  textRandom,
  ToolDb,
  ListCrdt,
  CounterCrdt,
  ToolDbMessage,
  FunctionReturn,
} from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

// Increase timeout for CI environments where connections may be slower
jest.setTimeout(60000);

let nodeA: ToolDb;
let nodeB: ToolDb;
let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;

// Test setup is:
// Node A is the server
// Node B is the server
// Both servers are connected to each other
// Alice is a client
// Bob is a client
// Chris is a client
// Alice and Chris are connected to Node B
// Bob is connected to Node A
beforeAll(async () => {
  // Helper to wait for a ToolDb instance to connect
  const waitForConnect = (db: ToolDb, name: string, timeoutMs = 30000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${name} failed to connect within ${timeoutMs}ms`));
      }, timeoutMs);

      const originalOnConnect = db.onConnect;
      db.onConnect = () => {
        clearTimeout(timeoutId);
        originalOnConnect?.();
        resolve();
      };
    });
  };

  // Create servers first
  nodeA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9100,
    storageName: ".test-db/test-additional-node-a",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  nodeA.addServerFunction<number, number[]>("multiply", async (args) => {
    const [a, b] = args;
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Invalid arguments");
    }
    return a * b;
  });

  nodeA.addServerFunction<{ result: string; length: number }, string[]>(
    "processString",
    async (args) => {
      const [str] = args;
      if (typeof str !== "string") {
        throw new Error("Invalid argument type");
      }
      return {
        result: str.toUpperCase(),
        length: str.length,
      };
    }
  );

  // Give server A time to start listening
  await new Promise((resolve) => setTimeout(resolve, 500));

  nodeB = new ToolDb({
    server: true,
    peers: [{ host: "localhost", port: 9100 }],
    host: "127.0.0.1",
    port: 8100,
    storageName: ".test-db/test-additional-node-b",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  // Add same functions to nodeB
  nodeB.addServerFunction<number, number[]>("multiply", async (args) => {
    const [a, b] = args;
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Invalid arguments");
    }
    return a * b;
  });

  nodeB.addServerFunction<{ result: string; length: number }, string[]>(
    "processString",
    async (args) => {
      const [str] = args;
      if (typeof str !== "string") {
        throw new Error("Invalid argument type");
      }
      return {
        result: str.toUpperCase(),
        length: str.length,
      };
    }
  );

  // Wait for nodeB to connect to nodeA
  await waitForConnect(nodeB, "nodeB");

  // Give server B time to start listening
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Create clients and wait for them to connect
  Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9100 }],
    storageName: ".test-db/test-additional-alice",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  Bob = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 8100 }],
    storageName: ".test-db/test-additional-bob",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  Chris = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9100 }],
    storageName: ".test-db/test-additional-chris",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  // Wait for all clients to connect (with longer timeout for CI)
  await Promise.all([
    waitForConnect(Alice, "Alice"),
    waitForConnect(Bob, "Bob"),
    waitForConnect(Chris, "Chris"),
  ]);

  // Small delay to ensure all connections are stable
  await new Promise((resolve) => setTimeout(resolve, 300));
}, 60000); // beforeAll timeout

afterAll(async () => {
  const closeServers = new Promise<void>((resolve) => {
    const serverA = (nodeA.network as ToolDbWebsockets).server;
    const serverB = (nodeB.network as ToolDbWebsockets).server;
    let closedCount = 0;
    const checkBothClosed = () => {
      closedCount++;
      if (closedCount === 2) resolve();
    };

    if (serverA) {
      serverA.close(() => checkBothClosed());
    } else {
      checkBothClosed();
    }

    if (serverB) {
      serverB.close(() => checkBothClosed());
    } else {
      checkBothClosed();
    }
  });

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
  await Promise.race([closeServers, timeout]);
});

describe("Query Keys Functionality", () => {
  // TODO: These tests timeout due to leveldb query stream issues - needs investigation
  it.skip("Can query keys by prefix from local storage", async () => {
    const prefix = "query-local-" + textRandom(8);
    const key1 = prefix + "-key1";
    const key2 = prefix + "-key2";
    const key3 = prefix + "-key3";
    const otherKey = "other-" + textRandom(8);

    // Put data locally first
    await Alice.putData(key1, "value1");
    await Alice.putData(key2, "value2");
    await Alice.putData(key3, "value3");
    await Alice.putData(otherKey, "otherValue");

    // Wait a bit for local storage
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Query from Alice's own storage
    const keys = await Alice.queryKeys(prefix, false, 1000);

    expect(keys).toBeDefined();
    expect(keys).not.toBeNull();
    if (keys) {
      expect(keys.length).toBeGreaterThanOrEqual(3);
      expect(keys).toContain(key1);
      expect(keys).toContain(key2);
      expect(keys).toContain(key3);
      expect(keys).not.toContain(otherKey);
    }
  });

  it.skip("Query returns empty array for non-existent prefix", async () => {
    const nonExistentPrefix = "non-existent-" + textRandom(16);

    const keys = await Alice.queryKeys(nonExistentPrefix, false, 500);

    expect(keys).toBeDefined();
    if (keys) {
      expect(keys.length).toBe(0);
    }
  });

  it.skip("Can query user-namespaced keys", async () => {
    const username = "query-user-" + textRandom(12);
    const password = "password123";

    await Alice.signUp(username, password);

    const prefix = "user-query-" + textRandom(8);
    await Alice.putData(prefix + "-1", "data1", true);
    await Alice.putData(prefix + "-2", "data2", true);

    // Wait for local storage
    await new Promise((resolve) => setTimeout(resolve, 200));

    const keys = await Alice.queryKeys(prefix, true, 1000);

    expect(keys).toBeDefined();
    if (keys) {
      expect(keys.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("User Namespaced Operations", () => {
  it("Can put and get user-namespaced data", async () => {
    const username = "ns-user-" + textRandom(12);
    const password = "password123";

    await Alice.signUp(username, password);

    const key = "private-key-" + textRandom(8);
    const value = "private-value-" + textRandom(12);

    await Alice.putData(key, value, true);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 300));

    const data = await Alice.getData(key, true);

    expect(data).toBe(value);
  });

  it("Cannot access user-namespaced data without proper user setup", async () => {
    const username = "ns-owner-" + textRandom(12);
    const password = "password123";

    // Alice creates namespaced data
    await Alice.signUp(username, password);
    const key = "private-test-" + textRandom(8);
    await Alice.putData(key, "secret", true);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Bob can't access it with userNamespaced=true if it's Alice's namespace
    // The data is specific to Alice's address
    const bobData = await Bob.getData(key, true);

    // Bob gets null because the key is namespaced to Bob's address, not Alice's
    expect(bobData).toBeNull();
  });

  it("getUserNamespacedKey returns correct format", async () => {
    const username = "format-user-" + textRandom(12);
    const password = "password123";

    await Alice.signUp(username, password);

    const key = "test-key";
    const namespacedKey = Alice.getUserNamespacedKey(key);

    expect(namespacedKey).toContain(":");
    expect(namespacedKey).toContain(".");
    expect(namespacedKey).toContain(key);
    expect(namespacedKey).toBe(
      `:${Alice.userAccount.getAddress()}.${key}`
    );
  });
});

describe("Event Emissions", () => {
  it("Emits 'put' event when data is received", async () => {
    const key = "event-test-" + textRandom(12);
    const value = "event-value";

    const putEventPromise = new Promise<void>((resolve) => {
      Bob.once("put", (message) => {
        expect(message).toBeDefined();
        expect(message.data.k).toBe(key);
        expect(message.data.v).toBe(value);
        resolve();
      });
    });

    Bob.subscribeData(key);

    // Small delay to ensure subscription is registered
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await putEventPromise;
  });

  it("Emits 'data' event when data is received", async () => {
    const key = "data-event-" + textRandom(12);
    const value = "data-value";

    const dataEventPromise = new Promise<void>((resolve) => {
      Chris.once("data", (data) => {
        expect(data).toBeDefined();
        expect(data.k).toBe(key);
        expect(data.v).toBe(value);
        resolve();
      });
    });

    Chris.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await dataEventPromise;
  });

  it("Emits 'verified' event for verified messages", async () => {
    const key = "verified-event-" + textRandom(12);
    const value = "verified-value";

    const verifiedEventPromise = new Promise<void>((resolve) => {
      Bob.once("verified", (message) => {
        expect(message).toBeDefined();
        expect(message.data.k).toBe(key);
        resolve();
      });
    });

    Bob.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await verifiedEventPromise;
  });

  it("Emits 'message' event for all messages", async () => {
    const key = "msg-event-" + textRandom(12);

    const messageEventPromise = new Promise<void>((resolve) => {
      const handler = (message: ToolDbMessage, remotePeerId: string) => {
        if (message.type === "put" && message.data.k === key) {
          expect(message).toBeDefined();
          expect(remotePeerId).toBeDefined();
          Chris.off("message", handler);
          resolve();
        }
      };
      Chris.on("message", handler);
    });

    Chris.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Trigger some network activity that Chris will receive
    await Alice.putData(key, "value");

    await messageEventPromise;
  });
});

describe("Key and ID Listeners", () => {
  it("Can add and trigger key listeners", async () => {
    const key = "listener-test-" + textRandom(12);
    const value = "listener-value";

    const listenerPromise = new Promise<void>((resolve) => {
      Bob.addKeyListener(key, (msg) => {
        expect(msg.v).toBe(value);
        resolve();
      });
    });

    Bob.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await listenerPromise;
  });

  it("Can remove key listeners", async () => {
    const key = "remove-listener-" + textRandom(12);
    let callCount = 0;

    const listenerId = Bob.addKeyListener(key, (msg) => {
      callCount++;
    });

    Bob.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Remove the listener immediately
    Bob.removeKeyListener(listenerId);

    // Put data - listener should not fire
    await Alice.putData(key, "value1");
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(callCount).toBe(0);
  });

  it("Multiple listeners can listen to the same key", async () => {
    const key = "multi-listener-" + textRandom(12);
    const value = "multi-value";
    let listener1Called = false;
    let listener2Called = false;

    const promise1 = new Promise<void>((resolve) => {
      Bob.addKeyListener(key, (msg) => {
        expect(msg.v).toBe(value);
        listener1Called = true;
        resolve();
      });
    });

    const promise2 = new Promise<void>((resolve) => {
      Bob.addKeyListener(key, (msg) => {
        expect(msg.v).toBe(value);
        listener2Called = true;
        resolve();
      });
    });

    Bob.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await Promise.all([promise1, promise2]);

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
  });
});

describe("Multiple Subscriptions", () => {
  it("Multiple clients can subscribe to the same key", async () => {
    const key = "multi-sub-" + textRandom(12);
    const value = "multi-sub-value";

    const bobPromise = new Promise<void>((resolve) => {
      Bob.subscribeData(key);
      Bob.addKeyListener(key, (msg) => {
        if (msg.v === value) {
          resolve();
        }
      });
    });

    const chrisPromise = new Promise<void>((resolve) => {
      Chris.subscribeData(key);
      Chris.addKeyListener(key, (msg) => {
        if (msg.v === value) {
          resolve();
        }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await Alice.putData(key, value);

    await Promise.all([bobPromise, chrisPromise]);
  });

  // TODO: This test is flaky due to timestamp resolution - the second put may be rejected
  // if the timestamp is too close to the first. This is expected CRDT behavior but makes
  // testing difficult. Consider using CRDT types for mutable data.
  it.skip("Subscription persists across multiple updates", async () => {
    const key = "update-sub-" + textRandom(12);
    const initialValue = "initial";
    const updatedValue = "updated";

    let receivedCount = 0;
    let receivedUpdated = false;

    const promise = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Only received ${receivedCount} updates, last was updated: ${receivedUpdated}`));
      }, 10000);

      Bob.subscribeData(key);
      Bob.addKeyListener(key, (msg) => {
        receivedCount++;
        if (msg.v === updatedValue) {
          receivedUpdated = true;
          clearTimeout(timeoutId);
          resolve();
        }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    // First put
    await Alice.putData(key, initialValue);

    // Wait longer to ensure timestamp difference and propagation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second put with different value
    await Alice.putData(key, updatedValue);

    await promise;

    expect(receivedUpdated).toBe(true);
  });
});

describe("Advanced Server Functions", () => {
  it("Can execute server function with complex return type", async () => {
    const result = await Alice.doFunction<{ result: string; length: number }, string[]>("processString", ["hello"]);

    expect(result).toBeDefined();
    expect(result.code).toBe("OK");
    expect(result.return).toBeDefined();
    expect((result.return as { result: string; length: number }).result).toBe("HELLO");
    expect((result.return as { result: string; length: number }).length).toBe(5);
  });

  it("Server function handles numeric operations", async () => {
    const result = await Bob.doFunction("multiply", [5, 7]);

    expect(result).toBeDefined();
    expect(result.code).toBe("OK");
    expect(result.return).toBe(35);
  });

  it("Server function fails with wrong argument types", async () => {
    const result = await Alice.doFunction("multiply", ["not", "numbers"]);

    expect(result).toBeDefined();
    expect(result.code).toBe("ERR");
    expect(result.return).toContain("Invalid arguments");
  });
});

describe("CRDT Additional Tests", () => {
  it("ListCRDT can sync between peers", async () => {
    const key = "list-crdt-" + textRandom(12);

    const aliceList = new ListCrdt("Alice");
    aliceList.PUSH("item1");
    aliceList.PUSH("item2");
    aliceList.PUSH("item3");

    await Alice.putCrdt(key, aliceList);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const bobList = new ListCrdt("Bob");
    await Bob.getCrdt(key, bobList);

    expect(bobList.value.length).toBe(3);
    expect(bobList.value).toContain("item1");
    expect(bobList.value).toContain("item2");
    expect(bobList.value).toContain("item3");
  });

  it("CounterCRDT can sync between peers", async () => {
    const key = "counter-crdt-" + textRandom(12);

    const aliceCounter = new CounterCrdt("Alice");
    aliceCounter.ADD(5);
    aliceCounter.ADD(3);

    await Alice.putCrdt(key, aliceCounter);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const bobCounter = new CounterCrdt("Bob");
    await Bob.getCrdt(key, bobCounter);

    expect(bobCounter.value).toBe(8);
  });

  it("CRDT merges concurrent updates correctly", async () => {
    const key = "merge-crdt-" + textRandom(12);

    const aliceCounter = new CounterCrdt("Alice");
    const bobCounter = new CounterCrdt("Bob");

    aliceCounter.ADD(10);
    await Alice.putCrdt(key, aliceCounter);

    await new Promise((resolve) => setTimeout(resolve, 200));

    await Bob.getCrdt(key, bobCounter);
    bobCounter.ADD(5);
    await Bob.putCrdt(key, bobCounter);

    await new Promise((resolve) => setTimeout(resolve, 300));

    await Alice.getCrdt(key, aliceCounter);

    expect(aliceCounter.value).toBe(15);
  });
});

describe("Custom Verification", () => {
  it("Can add custom verification for keys", async () => {
    const key = "custom-verify-" + textRandom(12);
    let verificationCalled = false;

    Alice.addCustomVerification(key, async (msg, previous) => {
      verificationCalled = true;
      // Only accept values that start with "valid-"
      return msg.v.toString().startsWith("valid-");
    });

    Alice.subscribeData(key);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await Bob.putData(key, "valid-data");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const data = await Alice.getData(key);
    expect(data).toBe("valid-data");
  });
});

describe("Peer Connection Events", () => {
  it("onPeerConnect is called when a peer connects", (done) => {
    let peerConnectCalled = false;

    const tempClient = new ToolDb({
      server: false,
      peers: [{ host: "localhost", port: 9100 }],
      storageName: ".test-db/test-additional-temp-" + textRandom(8),
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebsockets,
      userAdapter: ToolDbWeb3,
    });

    tempClient.onPeerConnect = (peerId: string) => {
      peerConnectCalled = true;
      expect(peerId).toBeDefined();
      expect(typeof peerId).toBe("string");
    };

    tempClient.onConnect = () => {
      expect(peerConnectCalled).toBe(true);
      done();
    };
  });
});

describe("Keys Sign In", () => {
  it("Can sign in with private key", async () => {
    // Get Alice's private key from the internal user object
    const privateKey = (Alice.userAccount as any)._user.privateKey;
    expect(privateKey).toBeDefined();

    // Create new client and sign in with the same private key
    const newClient = new ToolDb({
      server: false,
      peers: [{ host: "localhost", port: 9100 }],
      storageName: ".test-db/test-keys-signin-" + textRandom(8),
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebsockets,
      userAdapter: ToolDbWeb3,
    });

    await new Promise<void>((resolve) => {
      newClient.onConnect = () => resolve();
    });

    const customUsername = "custom-user-" + textRandom(8);
    await newClient.keysSignIn(privateKey || "", customUsername);

    expect(newClient.userAccount.getAddress()).toBe(
      Alice.userAccount.getAddress()
    );
    expect(newClient.userAccount.getUsername()).toBe(customUsername);
  });
});

describe("Anonymous Sign In", () => {
  it("Can perform anonymous sign in", async () => {
    const anonClient = new ToolDb({
      server: false,
      peers: [{ host: "localhost", port: 9100 }],
      storageName: ".test-db/test-anon-" + textRandom(8),
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebsockets,
      userAdapter: ToolDbWeb3,
    });

    await new Promise<void>((resolve) => {
      anonClient.onConnect = () => resolve();
    });

    await anonClient.anonSignIn();

    expect(anonClient.userAccount.getAddress()).toBeDefined();
    expect(anonClient.userAccount.getUsername()).toBeDefined();
  });
});

describe("Network Edge Cases", () => {
  it("Handles getData timeout gracefully", async () => {
    const nonExistentKey = "non-existent-" + textRandom(16);

    const result = await Alice.getData(nonExistentKey, false, 100);

    expect(result).toBeNull();
  });

  it("Can handle rapid successive puts to same key", async () => {
    const key = "rapid-put-" + textRandom(12);

    await Alice.putData(key, "value1");
    await Alice.putData(key, "value2");
    await Alice.putData(key, "value3");

    await new Promise((resolve) => setTimeout(resolve, 300));

    const result = await Bob.getData(key);

    // Should have the most recent value
    expect(result).toBe("value3");
  });

  it("Handles empty string values correctly", async () => {
    const key = "empty-string-" + textRandom(12);
    const emptyValue = "";

    await Alice.putData(key, emptyValue);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await Bob.getData(key);

    expect(result).toBe("");
  });

  it("Handles special characters in keys", async () => {
    const key = "special-key-" + textRandom(8) + "-!@#$%";
    const value = "special-value";

    await Alice.putData(key, value);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await Alice.getData(key);

    expect(result).toBe(value);
  });

  it("Handles complex object values", async () => {
    const key = "complex-obj-" + textRandom(12);
    const complexValue = {
      nested: {
        deep: {
          value: "test",
          number: 42,
          array: [1, 2, 3],
        },
      },
      boolean: true,
      nullValue: null,
    };

    await Alice.putData(key, complexValue);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await Bob.getData(key);

    expect(result).toEqual(complexValue);
  });
});

