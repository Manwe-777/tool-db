jest.mock("../getCrypto.ts");

import { ToolDb } from "..";
import leveldb from "../utils/leveldb";

jest.setTimeout(5000);

let Alice: ToolDb | undefined;

beforeAll((done) => {
  Alice = new ToolDb({
    server: false,
    peers: [{ host: "localhost", port: 9009 }],
    storageName: "test-alice-speed",
    storageAdapter: leveldb,
  });
  Alice.anonSignIn();
  done();
});

it("Can verify messages fast enough", async () => {
  const results = [];
  for (let i = 0; i < 100; i += 1) {
    await Alice.putData("fasttestkey-" + i, i).then((msg) => {
      const start = new Date().getTime();
      return Alice.verifyMessage(msg).then(() => {
        const end = new Date().getTime();
        results.push(end - start);
      });
    });
  }

  const average = results.reduce((a, b) => a + b, 0) / results.length;
  // This is not a good test, as it is not deterministic
  // It will vary depending the CI machine specs
  expect(average).toBeLessThan(0);
});
