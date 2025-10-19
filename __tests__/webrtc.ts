import {
  textRandom,
  ToolDb,
  MapCrdt,
  CounterCrdt,
  ListCrdt,
  VerificationData,
  ToolDbOptions,
  CrdtPutMessage,
} from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebRTC from "../packages/webrtc-network";
import ToolDbWeb3 from "../packages/web3-user";

// Try to load wrtc if available, otherwise skip these tests
let wrtc: any;
try {
  wrtc = require("wrtc");
} catch (e) {
  console.log("⚠️  wrtc package not available - WebRTC tests will be skipped");
  console.log("   To run WebRTC tests on Linux/Mac: npm install --save-dev wrtc");
  console.log("   Note: wrtc is not supported on Windows");
}

// Skip all tests if wrtc is not available
const describeOrSkip = wrtc ? describe : describe.skip;

jest.setTimeout(60000); // WebRTC connections can take longer than WebSocket

let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;

interface ToolDbWrtcOptions extends ToolDbOptions {
  wrtc: any;
}

describeOrSkip("WebRTC Network Tests", () => {
  beforeAll((done) => {
    // WebRTC setup is different from WebSocket:
    // - No central server nodes
    // - All peers connect via WebRTC trackers (WebSocket signaling servers)
    // - Peers discover each other through the tracker network

    const topic = `test-topic-${textRandom(8)}`;

    Alice = new ToolDb<ToolDbWrtcOptions>({
      server: false,
      topic,
      storageName: ".test-db/test-webrtc-alice",
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebRTC,
      userAdapter: ToolDbWeb3,
      wrtc, // Pass wrtc for Node.js environment
    });

    Bob = new ToolDb<ToolDbWrtcOptions>({
      server: false,
      topic,
      storageName: ".test-db/test-webrtc-bob",
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebRTC,
      userAdapter: ToolDbWeb3,
      wrtc,
    });

    Chris = new ToolDb<ToolDbWrtcOptions>({
      server: false,
      topic,
      storageName: ".test-db/test-webrtc-chris",
      storageAdapter: ToolDbLeveldb,
      networkAdapter: ToolDbWebRTC,
      userAdapter: ToolDbWeb3,
      wrtc,
    });

    const connected: string[] = [];
    let connectionTimeoutId: NodeJS.Timeout;

    const checkIfOk = (id: string, name: string) => {
      if (!connected.includes(id)) {
        connected.push(id);
        console.log(`✓ ${name} connected (${connected.length}/3)`);

        if (connected.length === 3) {
          clearTimeout(connectionTimeoutId);
          // Give a bit more time for peer discovery
          setTimeout(done, 2000);
        }
      }
    };

    Alice.onConnect = () => {
      const addr = Alice.peerAccount.getAddress() || "";
      checkIfOk(addr, "Alice");
    };

    Bob.onConnect = () => {
      const addr = Bob.peerAccount.getAddress() || "";
      checkIfOk(addr, "Bob");
    };

    Chris.onConnect = () => {
      const addr = Chris.peerAccount.getAddress() || "";
      checkIfOk(addr, "Chris");
    };

    // Set a timeout in case connections fail
    connectionTimeoutId = setTimeout(() => {
      if (connected.length < 3) {
        console.log(`⚠️  Only ${connected.length}/3 peers connected after timeout`);
        console.log("This might be due to tracker availability or network issues");
        // Call done anyway to not hang the test
        done();
      }
    }, 45000);
  });

  afterAll(async () => {
    // Clean up WebRTC connections
    if (Alice && Alice.network) {
      const network = Alice.network as ToolDbWebRTC;
      if (typeof network.onLeave === "function") {
        await network.onLeave();
      }
    }
    if (Bob && Bob.network) {
      const network = Bob.network as ToolDbWebRTC;
      if (typeof network.onLeave === "function") {
        await network.onLeave();
      }
    }
    if (Chris && Chris.network) {
      const network = Chris.network as ToolDbWebRTC;
      if (typeof network.onLeave === "function") {
        await network.onLeave();
      }
    }

    // Give some time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("Peers are signed in", () => {
    expect(Alice.userAccount.getAddress()).toBeDefined();
    expect(Bob.userAccount.getAddress()).toBeDefined();
    expect(Chris.userAccount.getAddress()).toBeDefined();
  });

  it("Peers are connected", () => {
    expect(Alice.isConnected).toBeTruthy();
    expect(Bob.isConnected).toBeTruthy();
    expect(Chris.isConnected).toBeTruthy();
  });

  it("Alice can put and get data", async () => {
    const testKey = "webrtc-test-key-" + textRandom(16);
    const testValue = "WebRTC test value";

    const msg = await Alice.putData(testKey, testValue);
    expect(msg).toBeDefined();

    // Give time for data to propagate through WebRTC network
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data = await Alice.getData(testKey);
    expect(data).toBe(testValue);
  });

  it("Alice and Bob can communicate through WebRTC", async () => {
    const testKey = "webrtc-comm-" + textRandom(16);
    const testValue = "P2P message";

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

  it("Alice can send and Chris can receive from subscription", async () => {
    const testKey = "webrtc-sub-" + textRandom(16);
    const testValue = "Subscription test";

    const subscriptionPromise = new Promise<VerificationData<string>>(
      (resolve) => {
        Chris.subscribeData(testKey);
        Chris.addKeyListener<string>(testKey, (msg) => {
          resolve(msg);
        });
      }
    );

    const msg = await Alice.putData(testKey, testValue);
    expect(msg).toBeDefined();

    const receivedMessage = await subscriptionPromise;

    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.v).toBe(testValue);
  });

  it("Alice can sign up and Bob can sign in via WebRTC", async () => {
    const testUsername = "webrtc-user-" + textRandom(16);
    const testPassword = "webrtc-password";

    try {
      const result = await Alice.signUp(testUsername, testPassword);
      expect(result).toBeDefined();

      // Wait for user data to propagate through WebRTC network
      // WebRTC might need more time than WebSocket
      const maxWait = 10000;
      const checkInterval = 300;
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
            throw new Error(
              `Sign in failed with unexpected error after ${attemptCount} attempts: ${errorMsg}`
            );
          }
          // User data hasn't propagated yet, wait and try again
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
        }
      }

      if (!signInSuccess) {
        throw new Error(
          `Sign in failed after ${attemptCount} attempts over ${maxWait}ms: ${lastError?.message || "unknown error"
          }`
        );
      }

      // Test for failed sign in
      await expect(
        Bob.signIn(testUsername, testPassword + " ")
      ).rejects.toThrow("Key derivation failed - possibly wrong password");
    } catch (error: any) {
      throw new Error(`Test failed: ${error.message}`);
    }
  });

  it("CRDTs work over WebRTC", async () => {
    const crdtKey = "webrtc-crdt-" + textRandom(16);
    const crdtValue = textRandom(24);

    const AliceDoc = new MapCrdt("Alice");
    AliceDoc.SET("webrtc-key", crdtValue);

    const BobDoc = new MapCrdt("Bob");
    BobDoc.SET("test", "foo");

    await Alice.putCrdt(crdtKey, AliceDoc);

    // Wait for data to propagate through WebRTC network
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await Bob.getCrdt<any>(crdtKey, BobDoc);

    expect(BobDoc.value).toStrictEqual({
      "webrtc-key": crdtValue,
      test: "foo",
    });
  });

  it("Multiple peers can discover each other", async () => {
    // Give time for peer discovery
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check that peers have discovered each other
    // Note: WebRTC connections are P2P, so we check if network is active
    expect(Alice.isConnected).toBeTruthy();
    expect(Bob.isConnected).toBeTruthy();
    expect(Chris.isConnected).toBeTruthy();
  });

  it("Three peers can collaboratively edit a MapCrdt", async () => {
    const crdtKey = "collab-map-" + textRandom(16);

    // Create CRDTs for each peer
    const AliceDoc = new MapCrdt<string>("Alice");
    const BobDoc = new MapCrdt<string>("Bob");
    const ChrisDoc = new MapCrdt<string>("Chris");

    // Each peer makes their own changes
    AliceDoc.SET("author", "Alice");
    AliceDoc.SET("color", "blue");

    BobDoc.SET("author", "Bob");
    BobDoc.SET("size", "large");

    ChrisDoc.SET("author", "Chris");
    ChrisDoc.SET("priority", "high");

    // Subscribe all peers to the same key
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // Set up listeners to track when updates arrive
    let bobUpdates = 0;
    let chrisUpdates = 0;

    Bob.addKeyListener(crdtKey, () => bobUpdates++);
    Chris.addKeyListener(crdtKey, () => chrisUpdates++);

    // Alice publishes first
    await Alice.putCrdt(crdtKey, AliceDoc);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Bob and Chris get Alice's changes and publish their own
    await Bob.getCrdt(crdtKey, BobDoc);
    await Bob.putCrdt(crdtKey, BobDoc);

    await Chris.getCrdt(crdtKey, ChrisDoc);
    await Chris.putCrdt(crdtKey, ChrisDoc);

    // Wait for all changes to propagate through the P2P network
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Now all peers fetch the final state
    await Alice.getCrdt(crdtKey, AliceDoc);
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // All peers should converge to the same state
    // "author" will be "Chris" due to deterministic conflict resolution
    const expectedValue = {
      author: "Chris", // Last writer wins with deterministic ordering
      color: "blue",
      size: "large",
      priority: "high",
    };

    expect(AliceDoc.value).toMatchObject(expectedValue);
    expect(BobDoc.value).toMatchObject(expectedValue);
    expect(ChrisDoc.value).toMatchObject(expectedValue);

    // Verify that updates were received
    expect(bobUpdates).toBeGreaterThan(0);
    expect(chrisUpdates).toBeGreaterThan(0);
  });

  it("Three peers can collaboratively edit a CounterCrdt", async () => {
    const crdtKey = "collab-counter-" + textRandom(16);

    // Create counters for each peer
    const AliceCounter = new CounterCrdt("Alice");
    const BobCounter = new CounterCrdt("Bob");
    const ChrisCounter = new CounterCrdt("Chris");

    // Subscribe all peers
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // Alice starts the counter
    AliceCounter.ADD(10);
    await Alice.putCrdt(crdtKey, AliceCounter);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Bob and Chris get the counter and add their own values
    await Bob.getCrdt(crdtKey, BobCounter);
    BobCounter.ADD(5);
    await Bob.putCrdt(crdtKey, BobCounter);

    await Chris.getCrdt(crdtKey, ChrisCounter);
    ChrisCounter.ADD(3);
    await Chris.putCrdt(crdtKey, ChrisCounter);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // All peers fetch final state
    await Alice.getCrdt(crdtKey, AliceCounter);
    await Bob.getCrdt(crdtKey, BobCounter);
    await Chris.getCrdt(crdtKey, ChrisCounter);

    // All should have the sum: 10 + 5 + 3 = 18
    expect(AliceCounter.value).toBe(18);
    expect(BobCounter.value).toBe(18);
    expect(ChrisCounter.value).toBe(18);
  });

  it("Three peers can collaboratively edit a ListCrdt", async () => {
    const crdtKey = "collab-list-" + textRandom(16);

    // Create lists for each peer
    const AliceList = new ListCrdt<string>("Alice");
    const BobList = new ListCrdt<string>("Bob");
    const ChrisList = new ListCrdt<string>("Chris");

    // Subscribe all peers
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // Alice adds some items
    AliceList.PUSH("apple");
    AliceList.PUSH("banana");
    await Alice.putCrdt(crdtKey, AliceList);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Bob gets the list and adds more items
    await Bob.getCrdt(crdtKey, BobList);
    BobList.PUSH("cherry");
    await Bob.putCrdt(crdtKey, BobList);

    // Chris gets the list and adds items
    await Chris.getCrdt(crdtKey, ChrisList);
    ChrisList.PUSH("date");
    await Chris.putCrdt(crdtKey, ChrisList);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // All peers fetch final state
    await Alice.getCrdt(crdtKey, AliceList);
    await Bob.getCrdt(crdtKey, BobList);
    await Chris.getCrdt(crdtKey, ChrisList);

    // All should have all items (order may vary due to concurrent edits)
    expect(AliceList.value).toContain("apple");
    expect(AliceList.value).toContain("banana");
    expect(AliceList.value).toContain("cherry");
    expect(AliceList.value).toContain("date");

    expect(BobList.value).toEqual(AliceList.value);
    expect(ChrisList.value).toEqual(AliceList.value);
  });

  it("Handles rapid concurrent edits from all peers", async () => {
    const crdtKey = "rapid-edits-" + textRandom(16);

    const AliceDoc = new MapCrdt<number>("Alice");
    const BobDoc = new MapCrdt<number>("Bob");
    const ChrisDoc = new MapCrdt<number>("Chris");

    // Subscribe all peers
    Alice.subscribeData(crdtKey);
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // All peers make rapid simultaneous edits
    const alicePromises: Promise<CrdtPutMessage<any> | null>[] = [];
    const bobPromises: Promise<CrdtPutMessage<any> | null>[] = [];
    const chrisPromises: Promise<CrdtPutMessage<any> | null>[] = [];

    for (let i = 0; i < 3; i++) {
      AliceDoc.SET(`alice-key-${i}`, i);
      alicePromises.push(Alice.putCrdt(crdtKey, AliceDoc));

      BobDoc.SET(`bob-key-${i}`, i);
      bobPromises.push(Bob.putCrdt(crdtKey, BobDoc));

      ChrisDoc.SET(`chris-key-${i}`, i);
      chrisPromises.push(Chris.putCrdt(crdtKey, ChrisDoc));

      // Small delay between bursts
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Wait for all puts to complete
    await Promise.all([...alicePromises, ...bobPromises, ...chrisPromises]);

    // Wait for network to settle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Fetch final state for all peers
    await Alice.getCrdt(crdtKey, AliceDoc);
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // Verify all peers have all keys
    const expectedKeys = [
      "alice-key-0", "alice-key-1", "alice-key-2",
      "bob-key-0", "bob-key-1", "bob-key-2",
      "chris-key-0", "chris-key-1", "chris-key-2",
    ];

    for (const key of expectedKeys) {
      expect(AliceDoc.value).toHaveProperty(key);
      expect(BobDoc.value).toHaveProperty(key);
      expect(ChrisDoc.value).toHaveProperty(key);
    }

    // All peers should have converged to the same state
    expect(AliceDoc.value).toEqual(BobDoc.value);
    expect(BobDoc.value).toEqual(ChrisDoc.value);
  });

  it("Handles conflicting edits with deterministic resolution", async () => {
    const crdtKey = "conflict-test-" + textRandom(16);

    const AliceDoc = new MapCrdt<string>("Alice");
    const BobDoc = new MapCrdt<string>("Bob");
    const ChrisDoc = new MapCrdt<string>("Chris");

    // Subscribe all peers
    Alice.subscribeData(crdtKey);
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // All three peers set the same key to different values simultaneously
    AliceDoc.SET("winner", "Alice wins");
    BobDoc.SET("winner", "Bob wins");
    ChrisDoc.SET("winner", "Chris wins");

    // Publish all at once (without waiting for propagation)
    await Promise.all([
      Alice.putCrdt(crdtKey, AliceDoc),
      Bob.putCrdt(crdtKey, BobDoc),
      Chris.putCrdt(crdtKey, ChrisDoc),
    ]);

    // Wait for network to resolve conflicts
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Fetch final state
    await Alice.getCrdt(crdtKey, AliceDoc);
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // All peers should have the same value (deterministic conflict resolution)
    expect(AliceDoc.value.winner).toBeDefined();
    expect(AliceDoc.value.winner).toBe(BobDoc.value.winner);
    expect(BobDoc.value.winner).toBe(ChrisDoc.value.winner);

    // The winner is determined by the CRDT's conflict resolution algorithm
    // (typically the one with the highest timestamp/peer ID)
    console.log(`Conflict resolved to: ${AliceDoc.value.winner}`);
  });

  it("Peers can merge changes from multiple sources", async () => {
    const crdtKey = "merge-test-" + textRandom(16);

    const AliceDoc = new MapCrdt<string>("Alice");
    const BobDoc = new MapCrdt<string>("Bob");
    const ChrisDoc = new MapCrdt<string>("Chris");

    // Subscribe all peers
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // Alice creates initial state
    AliceDoc.SET("status", "draft");
    AliceDoc.SET("created_by", "Alice");
    await Alice.putCrdt(crdtKey, AliceDoc);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Bob gets it and makes changes
    await Bob.getCrdt(crdtKey, BobDoc);
    BobDoc.SET("status", "review");
    BobDoc.SET("reviewed_by", "Bob");

    // Chris independently gets Alice's version and makes different changes
    await Chris.getCrdt(crdtKey, ChrisDoc);
    ChrisDoc.SET("priority", "high");
    ChrisDoc.SET("assigned_to", "Chris");

    // Both publish their changes
    await Promise.all([
      Bob.putCrdt(crdtKey, BobDoc),
      Chris.putCrdt(crdtKey, ChrisDoc),
    ]);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // All peers fetch the merged state
    await Alice.getCrdt(crdtKey, AliceDoc);
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // Verify that all changes are present (except conflicts)
    expect(AliceDoc.value.created_by).toBe("Alice");
    expect(AliceDoc.value.reviewed_by).toBe("Bob");
    expect(AliceDoc.value.assigned_to).toBe("Chris");
    expect(AliceDoc.value.priority).toBe("high");

    // Status had a conflict - should be resolved deterministically
    expect(AliceDoc.value.status).toBeDefined();

    // All peers should converge to the same state
    expect(AliceDoc.value).toEqual(BobDoc.value);
    expect(BobDoc.value).toEqual(ChrisDoc.value);
  });

  it("Counter CRDT handles concurrent increments correctly", async () => {
    const crdtKey = "concurrent-counter-" + textRandom(16);

    const AliceCounter = new CounterCrdt("Alice");
    const BobCounter = new CounterCrdt("Bob");
    const ChrisCounter = new CounterCrdt("Chris");

    // Subscribe all peers
    Alice.subscribeData(crdtKey);
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // All peers increment simultaneously without prior sync
    AliceCounter.ADD(1);
    BobCounter.ADD(1);
    ChrisCounter.ADD(1);

    await Promise.all([
      Alice.putCrdt(crdtKey, AliceCounter),
      Bob.putCrdt(crdtKey, BobCounter),
      Chris.putCrdt(crdtKey, ChrisCounter),
    ]);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Fetch final state
    await Alice.getCrdt(crdtKey, AliceCounter);
    await Bob.getCrdt(crdtKey, BobCounter);
    await Chris.getCrdt(crdtKey, ChrisCounter);

    // All increments should be preserved: 1 + 1 + 1 = 3
    expect(AliceCounter.value).toBe(3);
    expect(BobCounter.value).toBe(3);
    expect(ChrisCounter.value).toBe(3);
  });

  it("List CRDT handles concurrent insertions", async () => {
    const crdtKey = "concurrent-list-" + textRandom(16);

    const AliceList = new ListCrdt<string>("Alice");
    const BobList = new ListCrdt<string>("Bob");
    const ChrisList = new ListCrdt<string>("Chris");

    // Subscribe all peers
    Alice.subscribeData(crdtKey);
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // All peers insert items simultaneously
    AliceList.PUSH("A1");
    AliceList.PUSH("A2");

    BobList.PUSH("B1");
    BobList.PUSH("B2");

    ChrisList.PUSH("C1");
    ChrisList.PUSH("C2");

    await Promise.all([
      Alice.putCrdt(crdtKey, AliceList),
      Bob.putCrdt(crdtKey, BobList),
      Chris.putCrdt(crdtKey, ChrisList),
    ]);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Fetch final state
    await Alice.getCrdt(crdtKey, AliceList);
    await Bob.getCrdt(crdtKey, BobList);
    await Chris.getCrdt(crdtKey, ChrisList);

    // All items should be present
    expect(AliceList.value.length).toBe(6);
    expect(AliceList.value).toContain("A1");
    expect(AliceList.value).toContain("A2");
    expect(AliceList.value).toContain("B1");
    expect(AliceList.value).toContain("B2");
    expect(AliceList.value).toContain("C1");
    expect(AliceList.value).toContain("C2");

    // All peers should have the same result
    expect(AliceList.value).toEqual(BobList.value);
    expect(BobList.value).toEqual(ChrisList.value);
  });

  it("Handles DELETE operations in MapCrdt across peers", async () => {
    const crdtKey = "delete-test-" + textRandom(16);

    const AliceDoc = new MapCrdt<string>("Alice");
    const BobDoc = new MapCrdt<string>("Bob");
    const ChrisDoc = new MapCrdt<string>("Chris");

    // Subscribe all peers
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    // Alice creates initial state
    AliceDoc.SET("key1", "value1");
    AliceDoc.SET("key2", "value2");
    AliceDoc.SET("key3", "value3");
    await Alice.putCrdt(crdtKey, AliceDoc);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Bob and Chris get the state
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // Bob deletes key2
    BobDoc.DEL("key2");
    await Bob.putCrdt(crdtKey, BobDoc);

    // Chris updates key3 and deletes key1
    ChrisDoc.SET("key3", "updated");
    ChrisDoc.DEL("key1");
    await Chris.putCrdt(crdtKey, ChrisDoc);

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Fetch final state
    await Alice.getCrdt(crdtKey, AliceDoc);
    await Bob.getCrdt(crdtKey, BobDoc);
    await Chris.getCrdt(crdtKey, ChrisDoc);

    // key1 and key2 should be deleted, key3 should be updated
    expect(AliceDoc.value.key1).toBeUndefined();
    expect(AliceDoc.value.key2).toBeUndefined();
    expect(AliceDoc.value.key3).toBe("updated");

    // All peers should converge
    expect(AliceDoc.value).toEqual(BobDoc.value);
    expect(BobDoc.value).toEqual(ChrisDoc.value);
  });

  it("Stress test: Many rapid edits from all peers", async () => {
    const crdtKey = "stress-test-" + textRandom(16);

    const AliceCounter = new CounterCrdt("Alice");
    const BobCounter = new CounterCrdt("Bob");
    const ChrisCounter = new CounterCrdt("Chris");

    // Subscribe all peers
    Alice.subscribeData(crdtKey);
    Bob.subscribeData(crdtKey);
    Chris.subscribeData(crdtKey);

    const iterations = 10;
    let expectedTotal = 0;

    // Rapid fire increments
    for (let i = 0; i < iterations; i++) {
      AliceCounter.ADD(1);
      expectedTotal += 1;
      await Alice.putCrdt(crdtKey, AliceCounter);

      BobCounter.ADD(2);
      expectedTotal += 2;
      await Bob.putCrdt(crdtKey, BobCounter);

      ChrisCounter.ADD(3);
      expectedTotal += 3;
      await Chris.putCrdt(crdtKey, ChrisCounter);

      // Very short delay
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for network to settle
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Fetch final state
    await Alice.getCrdt(crdtKey, AliceCounter);
    await Bob.getCrdt(crdtKey, BobCounter);
    await Chris.getCrdt(crdtKey, ChrisCounter);

    // All increments should be preserved
    console.log(`Expected: ${expectedTotal}, Alice: ${AliceCounter.value}, Bob: ${BobCounter.value}, Chris: ${ChrisCounter.value}`);
    expect(AliceCounter.value).toBe(expectedTotal);
    expect(BobCounter.value).toBe(expectedTotal);
    expect(ChrisCounter.value).toBe(expectedTotal);
  });
});

// Always run these basic tests even without wrtc
describe("WebRTC Module Structure", () => {
  it("WebRTC adapter exports correctly", () => {
    expect(ToolDbWebRTC).toBeDefined();
    expect(typeof ToolDbWebRTC).toBe("function");
  });

  it("WebRTC adapter has required methods", () => {
    const mockToolDb = {
      options: { topic: "test" },
      logger: () => { },
      once: () => { },
      peerAccount: { getAddress: () => "test" },
    } as any;

    const adapter = new ToolDbWebRTC(mockToolDb);
    expect(adapter).toBeDefined();
    expect(typeof adapter.onLeave).toBe("function");
    expect(typeof adapter.close).toBe("function");
  });
});

