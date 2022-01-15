jest.mock("../getCrypto.ts");

import { textRandom, ToolDb } from "..";
import leveldb from "../utils/leveldb";
jest.setTimeout(5000);

let nodeA: ToolDb | undefined;
let nodeB: ToolDb | undefined;
let Alice: ToolDb | undefined;
let Bob: ToolDb | undefined;

beforeAll((done) => {
  nodeA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9000,
    storageName: "test-node-a",
    storageAdapter: leveldb,
  });
  nodeA.onConnect = () => checkIfOk(nodeA.options.id);

  nodeB = new ToolDb({
    server: true,
    // Node A is going to be our "bootstrap" node
    peers: [{ host: "localhost", port: 9000 }],
    host: "127.0.0.1",
    port: 8000,
    storageName: "test-node-b",
    storageAdapter: leveldb,
  });
  nodeB.onConnect = () => checkIfOk(nodeB.options.id);

  Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9000 }],
    storageName: "test-alice",
    storageAdapter: leveldb,
  });
  Alice.onConnect = () => checkIfOk(Alice.options.id);

  Bob = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 8000 }],
    storageName: "test-bob",
    storageAdapter: leveldb,
  });
  Bob.onConnect = () => checkIfOk(Bob.options.id);

  const connected = [];
  const checkIfOk = (id: string) => {
    if (!connected.includes(id)) {
      connected.push(id);

      if (connected.length === 3) {
        done();
      }
    }
  };
});

it("A and B can communicate trough the swarm", () => {
  return new Promise<void>((resolve) => {
    const testKey = "test-key-" + textRandom(16);
    const testValue = "Awesome value";

    Alice.anonSignIn()
      .then(() => Bob.anonSignIn())
      .then(() => {
        Alice.putData(testKey, testValue).then((msg) => {
          expect(msg).toBeDefined();

          setTimeout(() => {
            Bob.getData(testKey).then((data) => {
              expect(data).toBe(testValue);
              resolve();
            });
          }, 1000);
        });
      });
  });
});

it("A can sign up and B can sign in", () => {
  return new Promise<void>((resolve) => {
    const testUsername = "test-username-" + textRandom(16);
    const testPassword = "im a password";

    Alice.signUp(testUsername, testPassword).then((result) => {
      setTimeout(() => {
        Bob.signIn(testUsername, testPassword).then((res) => {
          expect(Bob.user).toBeDefined();
          expect(Bob.user.name).toBe(testUsername);

          // test for failed sign in
          Bob.signIn(testUsername, testPassword + " ").catch((e) => {
            expect(e).toBe("Invalid password");
            resolve();
          });
        });
      }, 1000);
    });
  });
});
