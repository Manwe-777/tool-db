jest.mock("../getCrypto.ts");
import elliptic from "elliptic";

import { ToolDb } from "..";

import leveldb from "../utils/leveldb";

jest.setTimeout(10000);

let nodeA: ToolDb;

beforeAll((done) => {
  (global as any).ecp256 = new elliptic.ec("p256");
  done();
});

afterAll((done) => {
  if (nodeA) {
    nodeA.network.server.close();
  }
  setTimeout(done, 500);
});

it("A can retry connection", (done) => {
  const Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: "test-alice",
    storageAdapter: leveldb,
  });
  Alice.anonSignIn();
  Alice.onConnect = () => {
    expect(Alice.isConnected).toBeTruthy();
    done();
  };

  setTimeout(() => {
    expect(Alice.isConnected).toBeFalsy();
    nodeA = new ToolDb({
      server: true,
      host: "127.0.0.1",
      port: 9000,
      storageName: "test-node-a",
      storageAdapter: leveldb,
    });
  }, Alice.options.wait * 3);
});
