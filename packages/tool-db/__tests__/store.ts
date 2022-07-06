import { textRandom, ToolDb } from "..";

import { ToolDbLeveldb } from "..";

let Alice: ToolDb;

beforeAll((done) => {
  Alice = new ToolDb({
    server: false,
    peers: [],
    storageName: "test-store",
    storageAdapter: ToolDbLeveldb,
  });
  Alice.anonSignIn();
  done();
});

afterAll((done) => {
  setTimeout(done, 500);
});

it("Can write and read inmediately", (done) => {
  setTimeout(() => {
    const testKey = "io-test-" + textRandom(16);
    const testValue = textRandom(24);

    Alice.store.put(testKey, testValue).finally(() => {
      Alice.store
        .get(testKey)
        .then((val) => {
          expect(val).toBe(testValue);
          done();
        })
        .catch(done);
    });
  }, 500);
});
