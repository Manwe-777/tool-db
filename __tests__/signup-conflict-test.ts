import { ToolDb } from "../packages/tool-db";
import ToolDbEcdsaUser from "../packages/ecdsa-user";
import ToolDbLevelStore from "../packages/leveldb-store";
import ToolDbWebsocketNetwork from "../packages/websocket-network";

describe("Local-first signup with conflict resolution", () => {
  let serverPeer: ToolDb;
  let clientPeer1: ToolDb;
  let clientPeer2: ToolDb;

  const SERVER_PORT = 8091;

  beforeAll(async () => {
    // Create server peer
    serverPeer = new ToolDb({
      server: true,
      port: SERVER_PORT,
      storageName: ".test-db/signup-conflict-server",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await serverPeer.ready;
  }, 30000);

  afterAll(async () => {
    await clientPeer1?.close();
    await clientPeer2?.close();
    await serverPeer?.close();
  }, 30000);

  test("should allow instant signup without network connection", async () => {
    // Create a client that is NOT connected to any peers
    const isolatedClient = new ToolDb({
      server: false,
      peers: [], // No peers!
      storageName: ".test-db/signup-isolated-client",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await isolatedClient.ready;

    const startTime = Date.now();
    
    // Signup should complete instantly, not wait for network timeout
    const signupResult = await isolatedClient.signUp("alice", "password123");
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(signupResult).toBeDefined();
    expect(signupResult.type).toBe("put");
    expect(signupResult.data.k).toBe("==alice");
    
    // Should be much faster than the old 3-second network timeout
    expect(duration).toBeLessThan(1000); // Should be instant (< 1 second)

    // Verify the user was stored locally
    const userData = await isolatedClient.getData("==alice", false, 100);
    expect(userData).toBeDefined();

    await isolatedClient.close();
  }, 30000);

  test("should reject duplicate signup on same peer", async () => {
    const client = new ToolDb({
      server: false,
      peers: [],
      storageName: ".test-db/signup-duplicate-client",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await client.ready;

    // First signup should succeed
    await client.signUp("bob", "password123");

    // Second signup with same username should fail immediately
    await expect(client.signUp("bob", "password456")).rejects.toThrow(
      "User already exists locally!"
    );

    await client.close();
  }, 30000);

  test("should resolve username conflicts based on timestamp when peers sync", async () => {
    // Create two isolated clients
    clientPeer1 = new ToolDb({
      server: false,
      peers: [], // Start isolated
      storageName: ".test-db/signup-conflict-client1",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    clientPeer2 = new ToolDb({
      server: false,
      peers: [], // Start isolated
      storageName: ".test-db/signup-conflict-client2",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await clientPeer1.ready;
    await clientPeer2.ready;

    // Both sign up with the same username while isolated
    const signup1Time = Date.now();
    const signup1 = await clientPeer1.signUp("charlie", "password1");
    
    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const signup2 = await clientPeer2.signUp("charlie", "password2");
    const signup2Time = Date.now();

    expect(signup1.data.t).toBeLessThan(signup2.data.t); // signup1 is older

    // Track conflict resolution events
    const conflictPromise = new Promise<any>((resolve) => {
      clientPeer2.once("username-conflict-resolved", resolve);
    });

    // Now connect them to the server to sync
    clientPeer1.options.peers = [`ws://localhost:${SERVER_PORT}`];
    clientPeer2.options.peers = [`ws://localhost:${SERVER_PORT}`];

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Wait for conflict to be detected and resolved
    const conflictEvent = await conflictPromise;

    expect(conflictEvent).toBeDefined();
    expect(conflictEvent.username).toBe("==charlie");
    expect(conflictEvent.winner).toBe("remote"); // signup1 wins because it's older

    // Verify that client2's local data was replaced with client1's older signup
    const charlieData = await clientPeer2.getData("==charlie", false, 1000);
    expect(charlieData).toBeDefined();
    
    // The stored data should match signup1's address (the winner)
    const storedData = await clientPeer2.store.get("==charlie");
    const parsed = JSON.parse(storedData);
    expect(parsed.a).toBe(signup1.data.a); // Winner's address
    expect(parsed.t).toBe(signup1.data.t); // Winner's timestamp
  }, 60000);

  test("should emit event when current user loses username conflict", async () => {
    // Create client that will lose the username
    const losingClient = new ToolDb({
      server: false,
      peers: [],
      storageName: ".test-db/signup-losing-client",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await losingClient.ready;

    // Sign up locally
    const lateSignup = await losingClient.signUp("david", "password");
    await losingClient.signIn("david", "password");

    // Verify the user is signed in
    expect(losingClient.userAccount.getAddress()).toBe(lateSignup.data.a);

    // Track the "current-user-lost-username" event
    const lostUsernamePromise = new Promise<any>((resolve) => {
      losingClient.once("current-user-lost-username", resolve);
    });

    // Simulate an earlier signup from another peer by directly putting older data
    const earlierTimestamp = lateSignup.data.t - 10000; // 10 seconds earlier
    const winningClient = new ToolDb({
      server: false,
      peers: [],
      storageName: ".test-db/signup-winning-client",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await winningClient.ready;

    // Manually create an earlier signup
    const winningAccount = new ToolDbEcdsaUser(winningClient);
    await winningAccount.anonUser();
    
    const userData = await winningAccount.encryptAccount("winner-password");
    const winningSignup = {
      k: "==david",
      a: winningAccount.getAddress() || "",
      n: 0,
      t: earlierTimestamp,
      h: "test-hash",
      s: await winningAccount.signData("test-hash"),
      v: userData,
      c: null,
    };

    // Store the winning signup in winning client
    await winningClient.store.put("==david", JSON.stringify(winningSignup));

    // Connect both clients to server
    losingClient.options.peers = [`ws://localhost:${SERVER_PORT}`];
    winningClient.options.peers = [`ws://localhost:${SERVER_PORT}`];

    // Broadcast the winning signup
    winningClient.network.sendToAll({
      type: "put",
      id: "test-conflict",
      to: [],
      data: winningSignup,
    });

    // Wait for the event
    const lostEvent = await lostUsernamePromise;

    expect(lostEvent).toBeDefined();
    expect(lostEvent.username).toBe("david");
    expect(lostEvent.winnerAddress).toBe(winningAccount.getAddress());

    await losingClient.close();
    await winningClient.close();
  }, 60000);

  test("should handle signup with peers present seamlessly", async () => {
    const connectedClient = new ToolDb({
      server: false,
      peers: [`ws://localhost:${SERVER_PORT}`],
      storageName: ".test-db/signup-connected-client",
      userAdapter: ToolDbEcdsaUser,
      storageAdapter: ToolDbLevelStore,
      networkAdapter: ToolDbWebsocketNetwork,
      debug: false,
    });

    await connectedClient.ready;

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const startTime = Date.now();
    
    // Signup with peers should still be fast (not wait for full network check)
    const signupResult = await connectedClient.signUp("eve", "password123");
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(signupResult).toBeDefined();
    expect(signupResult.type).toBe("put");
    
    // Should still be fast even with network present
    expect(duration).toBeLessThan(2000);

    await connectedClient.close();
  }, 30000);
});

