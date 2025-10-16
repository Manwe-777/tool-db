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

jest.setTimeout(15000);

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
beforeAll((done) => {
  nodeA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9000,
    storageName: "test-node-a",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  nodeA.onConnect = () => checkIfOk(nodeA.peerAccount.getAddress() || "");

  nodeA.addServerFunction<number, number[]>("test", (args) => {
    const [a, b] = args;

    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Invalid arguments");
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve((a as any) + (b as any));
      }, 1000);
    });
  });

  nodeB = new ToolDb({
    server: true,
    // Node A is going to be our "bootstrap" node
    peers: [{ host: "localhost", port: 9000 }],
    host: "127.0.0.1",
    port: 8000,
    storageName: "test-node-b",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  nodeB.onConnect = () => checkIfOk(nodeB.peerAccount.getAddress() || "");

  Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: "test-alice",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  Alice.onConnect = () => checkIfOk(Alice.peerAccount.getAddress() || "");

  Bob = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 8000 }],
    storageName: "test-bob",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  Bob.onConnect = () => checkIfOk(Bob.peerAccount.getAddress() || "");

  Chris = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: "test-chris",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  Chris.onConnect = () => checkIfOk(Chris.peerAccount.getAddress() || "");

  const connected: string[] = [];
  const checkIfOk = (id: string) => {
    if (!connected.includes(id)) {
      connected.push(id);

      if (connected.length === 4) {
        done();
        // console.log(`
        //   test-node-a: ${nodeA.network.getClientAddress()}
        //   test-node-b: ${nodeB.network.getClientAddress()}
        //   test-alice: ${Alice.network.getClientAddress()}
        //   test-bob: ${Bob.network.getClientAddress()}
        //   test-chris: ${Chris.network.getClientAddress()}
        // `);
      }
    }
  };
});

afterAll((done) => {
  // as any, since we dont have the type for the server yet.
  (nodeA.network as ToolDbWebsockets).server?.close();
  (nodeB.network as ToolDbWebsockets).server?.close();

  setTimeout(done, 1000);
});

it("All peers have correct servers data", (done) => {
  // Clients should connect to both servers automatically
  setTimeout(() => {
    expect(Alice.serverPeers.length).toBe(2);
    expect(Bob.serverPeers.length).toBe(2);
    expect(Chris.serverPeers.length).toBe(2);
    done();
  }, 1000);
});

it("A and B are signed in", () => {
  expect(Alice.userAccount.getAddress()).toBeDefined();
  expect(Bob.userAccount.getAddress()).toBeDefined();
  expect(Chris.userAccount.getAddress()).toBeDefined();
});

it("A can put and get", (done) => {
  setTimeout(() => {
    const testKey = "test-key-" + textRandom(16);
    const testValue = "Cool value";

    Alice.putData(testKey, testValue).then((msg) => {
      expect(msg).toBeDefined();
      setTimeout(() => {
        Alice.getData(testKey).then((data) => {
          expect(data).toBe(testValue);
          done();
        });
      }, 1000);
    });
  }, 500);
});

it("A and B can communicate trough the swarm", (done) => {
  setTimeout(() => {
    const testKey = "test-key-" + textRandom(16);
    const testValue = "Awesome value";

    Alice.putData(testKey, testValue).then((msg) => {
      expect(msg).toBeDefined();

      setTimeout(() => {
        Bob.getData(testKey).then((data) => {
          expect(data).toBe(testValue);
          done();
        });
      }, 1000);
    });
  }, 500);
});

it("A cand send and C can recieve from a subscription", (done) => {
  setTimeout(() => {
    const testKey = "test-key-" + textRandom(16);
    const testValue = "im a value";

    let recievedMessage: VerificationData<string> | undefined = undefined;

    Chris.subscribeData(testKey);
    Chris.addKeyListener<string>(testKey, (msg) => {
      recievedMessage = msg;
    });

    Alice.putData(testKey, testValue)
      .then((msg) => {
        expect(msg).toBeDefined();

        setTimeout(() => {
          expect(recievedMessage).toBeDefined();
          expect(recievedMessage?.v).toBe(testValue);
          done();
        }, 1000);
      })
      .catch(() => {
        done();
      });
  }, 1000);
});

it("A can sign up and B can sign in", (done) => {
  setTimeout(() => {
    const testUsername = "test-username-" + textRandom(16);
    const testPassword = "im a password";
    Alice.signUp(testUsername, testPassword)
      .then((result) => {
        expect(result).toBeDefined();
        setTimeout(() => {
          Bob.signIn(testUsername, testPassword)
            .then((res) => {
              expect(res).toBeDefined();
              expect(Bob.userAccount.getAddress()).toBeDefined();
              expect(Bob.userAccount.getUsername()).toBe(testUsername);

              // test for failed sign in
              setTimeout(() => {
                Bob.signIn(testUsername, testPassword + " ").catch((e) => {
                  expect(e.message).toBe(
                    "Key derivation failed - possibly wrong password"
                  );
                  done();
                });
              }, 500);
            })
            .catch((e) => {
              done();
            });
        }, 500);
      })
      .catch((e) => {
        done();
      });
  }, 500);
});

it("Can cancel GET timeout", (done) => {
  setTimeout(() => {
    const testKey = "timeout-test-" + textRandom(16);
    const testValue = textRandom(24);

    Alice.putData(testKey, testValue).then(() => {
      Alice.getData(testKey, false, 1).then((res) => {
        expect(res).toBe(testValue);
        done();
      });
    });
  }, 500);
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

it("CRDTs", (done) => {
  setTimeout(() => {
    const crdtKey = "crdt-test-" + textRandom(16);
    const crdtValue = textRandom(24);

    const AliceDoc = new MapCrdt("Alice");
    AliceDoc.SET("key", crdtValue);

    const BobDoc = new MapCrdt("Bob");
    BobDoc.SET("test", "foo");

    Alice.putCrdt(crdtKey, AliceDoc).then(async (put) => {
      setTimeout(() => {
        Bob.getCrdt<any>(crdtKey, BobDoc).then((data) => {
          expect(BobDoc.value).toStrictEqual({
            key: crdtValue,
            test: "foo",
          });
          done();
        });
      }, 500);
    });
  }, 500);
});
