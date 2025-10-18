import { ToolDb } from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

jest.setTimeout(20000);

let nodeA: ToolDb;

afterAll(async () => {
  if (nodeA) {
    const closePromise = new Promise<void>((resolve) => {
      const server = (nodeA.network as any).server;
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });

    // Add timeout to prevent hanging
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
    await Promise.race([closePromise, timeout]);
  }
});

it("A can retry connection", async () => {
  const Alice = new ToolDb({
    server: false,
    maxRetries: 1000,
    peers: [{ host: "localhost", port: 8001 }],
    storageName: ".test-db/test-base-client",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  Alice.anonSignIn();

  const connectionPromise = new Promise<void>((resolve) => {
    Alice.onConnect = () => {
      expect(Alice.isConnected).toBeTruthy();
      resolve();
    };
  });

  // Simulate server coming online after client has started attempting to connect
  // This delay is intentional to test the retry mechanism
  await new Promise((resolve) => setTimeout(resolve, 5000));

  expect(Alice.isConnected).toBeFalsy();

  nodeA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 8001,
    storageName: ".test-db/test-base-server",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  nodeA.anonSignIn();

  // Wait for Alice to successfully connect
  await connectionPromise;
});
