jest.mock("../getCrypto.ts");

import { textRandom, ToolDb } from "..";
import leveldb from "../utils/leveldb";
jest.setTimeout(20000);

/*

Network tests;
Should setup two non server nodes
two server nodes
each non server talks to a server
B puts some data too
then A tries to get the data the other node put before, with just one message each.

*/

it("Can connect a swarm", () => {
  return new Promise<void>((resolve) => {
    const Alice = new ToolDb({
      server: false,
      peers: [{ host: "localhost", port: 9000 }],
      storageName: "test-alice",
      storageAdapter: leveldb,
    });

    const Bob = new ToolDb({
      server: false,
      peers: [{ host: "localhost", port: 8000 }],
      storageName: "test-bob",
      storageAdapter: leveldb,
    });

    const nodeA = new ToolDb({
      server: true,
      host: "127.0.0.1",
      port: 9000,
      storageName: "test-node-a",
      storageAdapter: leveldb,
    });

    const nodeB = new ToolDb({
      server: true,
      // Node A is going to be our "bootstrap" node
      peers: [{ host: "localhost", port: 9000 }],
      host: "127.0.0.1",
      port: 8000,
      storageName: "test-node-b",
      storageAdapter: leveldb,
    });

    const testKey = "test-key-" + textRandom(16);
    const testValue = "Awesome value";

    const connected = [];
    const checkIfOk = (id: string) => {
      if (!connected.includes(id)) {
        connected.push(id);

        if (connected.length === 4) {
          console.log("HEY THIS LOOKS GOOD");
          Alice.putData(testKey, testValue).then((msg) => {
            console.log(msg);
            // expect(msg).toBeUndefined();
            expect(connected.length).toBe(4);
            resolve();
          });
        }
      }
    };

    Alice.onConnect = () => checkIfOk(Alice.options.id);
    Bob.onConnect = () => checkIfOk(Bob.options.id);
    nodeA.onConnect = () => checkIfOk(nodeA.options.id);
    nodeB.onConnect = () => checkIfOk(nodeB.options.id);
  });
});
