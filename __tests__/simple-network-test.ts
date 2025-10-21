import { ToolDb } from "../packages/tool-db";
import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

jest.setTimeout(30000);

it("Simple server-client connection", async () => {
  const connections: string[] = [];
  
  const server = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9999,
    storageName: ".test-db/simple-server",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  server.onConnect = () => {
    connections.push("server");
    console.log("Server connected");
  };

  // Wait for server to be ready and sign in
  await server.ready;
  server.anonSignIn();
  console.log("Server ready");

  const client = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9999 }],
    storageName: ".test-db/simple-client",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

  client.onConnect = () => {
    connections.push("client");
    console.log("Client connected");
  };

  // Wait for client to be ready and sign in
  await client.ready;
  client.anonSignIn();
  console.log("Client ready");

  // Wait for connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("Connections:", connections);
  expect(connections.length).toBeGreaterThan(0);

  // Cleanup
  if ((server.network as ToolDbWebsockets).server) {
    await new Promise<void>((resolve) => {
      (server.network as ToolDbWebsockets).server!.close(() => resolve());
    });
  }
  
  // Close databases properly
  await client.close();
  await server.close();
});

