import {
  getMessageHash,
  PutMessage,
  sha256,
  ToolDb,
  textRandom,
  VerificationData,
} from "../packages/tool-db";

import ToolDbLeveldb from "../packages/leveldb-store";
import ToolDbWebsockets from "../packages/websocket-network";
import ToolDbWeb3 from "../packages/web3-user";

jest.setTimeout(30000);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForConnect = (db: ToolDb) =>
  new Promise<void>((resolve) => {
    if (db.isConnected) resolve();
    db.onConnect = () => resolve();
  });

let server: ToolDb;
let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;

const client = (name: string) =>
  new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9310 }],
    storageName: `.test-db/test-network-security-${name}`,
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });

beforeAll(async () => {
  server = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9310,
    storageName: ".test-db/test-network-security-server",
    storageAdapter: ToolDbLeveldb,
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  await wait(500);

  Alice = client("alice");
  Bob = client("bob");
  Chris = client("chris");
  await Promise.all([Alice, Bob, Chris].map(waitForConnect));
  await Promise.all([Alice, Bob, Chris].map((db) => db.anonSignIn()));
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    (server.network as ToolDbWebsockets).server.close(() => resolve());
    setTimeout(resolve, 2000);
  });
});

it("Does not return forged data from a GET reply", async () => {
  const key = "forged-get-" + textRandom(12);
  await Bob.putData(key, "real value");
  await wait(500);

  // A malicious (or compromised) server swaps the value it stores
  const stored = JSON.parse(await server.store.get(key));
  await server.store.put(key, JSON.stringify({ ...stored, v: "forged" }));

  // Chris has nothing locally, so he asks the server
  const value = await Chris.getData(key);
  expect(value).not.toBe("forged");
});

it("Does not return valid data from another key in a GET reply", async () => {
  const key = "swapped-get-" + textRandom(12);
  const otherKey = "swapped-get-other-" + textRandom(12);
  await Bob.putData(key, "real value");
  await Bob.putData(otherKey, "other value");
  await wait(500);

  // The server replies with a valid message, but for a different key
  await server.store.put(key, await server.store.get(otherKey));

  const value = await Chris.getData(key);
  expect(value).not.toBe("other value");
});

it("Replies to every GET, even if the data was already sent", async () => {
  const key = "repeated-get-" + textRandom(12);
  await Bob.putData(key, "value");
  await wait(500);

  // A client that keeps nothing locally, so it relies on the server replies
  const noStore = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9310 }],
    networkAdapter: ToolDbWebsockets,
    userAdapter: ToolDbWeb3,
  });
  await waitForConnect(noStore);
  await wait(300);

  expect(await noStore.getData(key)).toBe("value");
  expect(await noStore.getData(key)).toBe("value");
});

// Known issue: signup timestamps are chosen by the signer, and the oldest
// signup wins a username. Anyone can claim an existing username by signing
// their own signup with an older timestamp. Remove `.failing` once fixed.
describe("Username hijacking by backdating", () => {
  const hijack = async (getTimestamp: (victimTimestamp: number) => number) => {
    const username = "victim-" + textRandom(12);
    const userRoot = `==${username}`;

    await Alice.signUp(username, "password");
    await wait(500);
    const victim = JSON.parse(await server.store.get(userRoot));

    // The attacker signs a signup with their own keys and an older timestamp
    const attacker = Bob.userAccount;
    const userData = await attacker.encryptAccount(sha256("password"));
    const t = getTimestamp(victim.t);
    const h = getMessageHash(
      JSON.stringify(userData),
      attacker.getAddress() || "",
      t
    );
    const data: VerificationData = {
      k: userRoot,
      a: attacker.getAddress() || "",
      n: 0,
      t,
      h,
      s: await attacker.signData(h),
      v: userData,
      c: null,
    };
    const message: PutMessage = {
      type: "put",
      id: textRandom(10),
      to: [],
      data,
    };
    Bob.network.sendToAll(message);
    await wait(500);

    const owner = JSON.parse(await server.store.get(userRoot));
    expect(owner.a).toBe(victim.a);
  };

  it.failing("Can not claim a username with an ancient timestamp", () =>
    hijack(() => 1)
  );

  it.failing("Can not claim a username just before the original signup", () =>
    hijack((victimTimestamp) => victimTimestamp - 1)
  );
});
