import {
  textRandom,
  ToolDb,
  MapCrdt,
  VerificationData,
  ToolDbNetworkAdapter,
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
    port: 9000,
    storageName: ".test-db/test-node-a",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  nodeA.addServerFunction<number, number[]>("test", async (args) => {
    const [a, b] = args;

    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Invalid arguments");
    }

    // Simulate async work without arbitrary timeout
    return (a as any) + (b as any);
  });

  // Give server A time to start listening
  await new Promise((resolve) => setTimeout(resolve, 500));

  nodeB = new ToolDb({
    server: true,
    // Node A is going to be our "bootstrap" node
    peers: [{ host: "localhost", port: 9000 }],
    host: "127.0.0.1",
    port: 8000,
    storageName: ".test-db/test-node-b",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  // Wait for nodeB to connect to nodeA
  await waitForConnect(nodeB, "nodeB");

  // Give server B time to start listening
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Create clients and wait for them to connect
  Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: ".test-db/test-alice",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  Bob = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 8000 }],
    storageName: ".test-db/test-bob",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  Chris = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: ".test-db/test-chris",
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
  // as any, since we dont have the type for the server yet.
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

  // Add timeout to prevent hanging
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
  await Promise.race([closeServers, timeout]);
});

it("All peers have correct servers data", async () => {
  // Clients should connect to both servers automatically
  // Wait for network to stabilize and peers to discover servers
  const waitForServerPeers = (client: typeof Alice, maxWaitMs = 3000, checkIntervalMs = 100) => {
    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (client.serverPeers.length >= 2) {
          resolve();
        } else if (Date.now() - startTime > maxWaitMs) {
          reject(new Error(`Timeout: ${client.userAccount.getUsername()} discovered only ${client.serverPeers.length} servers`));
        } else {
          setTimeout(check, checkIntervalMs);
        }
      };

      check();
    });
  };

  await Promise.all([
    waitForServerPeers(Alice),
    waitForServerPeers(Bob),
    waitForServerPeers(Chris),
  ]);

  expect(Alice.serverPeers.length).toBeGreaterThanOrEqual(2);
  expect(Bob.serverPeers.length).toBeGreaterThanOrEqual(2);
  expect(Chris.serverPeers.length).toBeGreaterThanOrEqual(2);
});

it("A and B are signed in", () => {
  expect(Alice.userAccount.getAddress()).toBeDefined();
  expect(Bob.userAccount.getAddress()).toBeDefined();
  expect(Chris.userAccount.getAddress()).toBeDefined();
});

it("A can put and get", async () => {
  const testKey = "test-key-" + textRandom(16);
  const testValue = "Cool value";

  const msg = await Alice.putData(testKey, testValue);
  expect(msg).toBeDefined();

  const data = await Alice.getData(testKey);
  expect(data).toBe(testValue);
});

it("A and B can communicate trough the swarm", async () => {
  const testKey = "test-key-" + textRandom(16);
  const testValue = "Awesome value";

  // Set up listener before putting data
  const dataPromise = new Promise<void>((resolve) => {
    Bob.subscribeData(testKey);
    Bob.addKeyListener<string>(testKey, (msg) => {
      if (msg.v === testValue) {
        resolve();
      }
    });
  });

  const msg = await Alice.putData(testKey, testValue);
  expect(msg).toBeDefined();

  // Wait for Bob to receive the data
  await dataPromise;

  const data = await Bob.getData(testKey);
  expect(data).toBe(testValue);
});

it("A cand send and C can recieve from a subscription", async () => {
  const testKey = "test-key-" + textRandom(16);
  const testValue = "im a value";

  const subscriptionPromise = new Promise<VerificationData<string>>((resolve) => {
    Chris.subscribeData(testKey);
    Chris.addKeyListener<string>(testKey, (msg) => {
      resolve(msg);
    });
  });

  const msg = await Alice.putData(testKey, testValue);
  expect(msg).toBeDefined();

  const recievedMessage = await subscriptionPromise;

  expect(recievedMessage).toBeDefined();
  expect(recievedMessage.v).toBe(testValue);
});

it("A can sign up and B can sign in", async () => {
  const testUsername = "test-username-" + textRandom(16);
  const testPassword = "im a password";

  try {
    const result = await Alice.signUp(testUsername, testPassword);
    expect(result).toBeDefined();

    // Wait for user data to propagate through the network
    const maxWait = 7000;
    const checkInterval = 200;
    const startTime = Date.now();

    let signInSuccess = false;
    let lastError: any = null;
    let attemptCount = 0;

    while (Date.now() - startTime < maxWait && !signInSuccess) {
      try {
        attemptCount++;
        const res = await Bob.signIn(testUsername, testPassword);
        expect(res).toBeDefined();
        expect(Bob.userAccount.getAddress()).toBeDefined();
        expect(Bob.userAccount.getUsername()).toBe(testUsername);
        signInSuccess = true;
      } catch (e: any) {
        lastError = e;
        const errorMsg = e?.message || e?.toString() || String(e);
        if (errorMsg !== "Could not find user") {
          // Different error, fail immediately
          throw new Error(`Sign in failed with unexpected error after ${attemptCount} attempts: ${errorMsg} (type: ${typeof e})`);
        }
        // User data hasn't propagated yet, wait and try again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    if (!signInSuccess) {
      throw new Error(`Sign in failed after ${attemptCount} attempts over ${maxWait}ms: ${lastError?.message || 'unknown error'}`);
    }

    // test for failed sign in
    await expect(
      Bob.signIn(testUsername, testPassword + " ")
    ).rejects.toThrow("Key derivation failed - possibly wrong password");
  } catch (error: any) {
    throw new Error(`Test failed: ${error.message}`);
  }
});

it("Can cancel GET timeout", async () => {
  const testKey = "timeout-test-" + textRandom(16);
  const testValue = textRandom(24);

  await Alice.putData(testKey, testValue);
  const res = await Alice.getData(testKey, false, 1);
  expect(res).toBe(testValue);
});

it("Can execute a server function", () => {
  return new Promise<void>((resolve) => {
    Alice.doFunction("test", [12, 8]).then((d) => {
      expect(d.return).toBe(20);
      expect(d.code).toBe("OK");
      resolve();
    });
  });
});

it("Server function may fail safely", () => {
  return new Promise<void>((resolve) => {
    Alice.doFunction("test", []).then((d) => {
      expect(d.return).toBe("Error: Invalid arguments");
      expect(d.code).toBe("ERR");
      resolve();
    });
  });
});

it("Server function may not be found", () => {
  return new Promise<void>((resolve) => {
    Alice.doFunction("boom", []).then((d) => {
      expect(d.return).toBe("Function not found");
      expect(d.code).toBe("NOT_FOUND");
      resolve();
    });
  });
});

it("CRDTs", async () => {
  const crdtKey = "crdt-test-" + textRandom(16);
  const crdtValue = textRandom(24);

  const AliceDoc = new MapCrdt("Alice");
  AliceDoc.SET("key", crdtValue);

  const BobDoc = new MapCrdt("Bob");
  BobDoc.SET("test", "foo");

  await Alice.putCrdt(crdtKey, AliceDoc);

  // Wait a bit for data to propagate, then get
  // The getCrdt has a timeout, so if data doesn't arrive it will fall back to local store
  await new Promise(resolve => setTimeout(resolve, 300));

  await Bob.getCrdt<any>(crdtKey, BobDoc);

  expect(BobDoc.value).toStrictEqual({
    key: crdtValue,
    test: "foo",
  });
});
