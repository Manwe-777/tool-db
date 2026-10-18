import {
  createGroupKey,
  decryptForGroup,
  encryptForGroup,
  ToolDb,
  ToolDbUserAdapter,
  unwrapGroupKey,
  wrapGroupKey,
} from "../packages/tool-db";

let Alice: ToolDb;
let Bob: ToolDb;
let Chris: ToolDb;

const address = (db: ToolDb) => db.userAccount.getAddress() || "";

beforeAll(() => {
  [Alice, Bob, Chris] = [new ToolDb(), new ToolDb(), new ToolDb()];
});

afterAll(() => Promise.all([Alice, Bob, Chris].map((db) => db.close())));

it("Encrypts messages between users", async () => {
  const payload = await Alice.userAccount.nip44Encrypt(address(Bob), "hi bob");
  expect(await Bob.userAccount.nip44Decrypt(address(Alice), payload)).toBe(
    "hi bob"
  );
  // Nobody else can read it
  await expect(
    Chris.userAccount.nip44Decrypt(address(Alice), payload)
  ).rejects.toThrow();
});

it("Shares a group key with the members of a group", async () => {
  const groupKey = createGroupKey();

  const forBob = await wrapGroupKey(Alice.userAccount, groupKey, address(Bob));
  expect(await unwrapGroupKey(Bob.userAccount, forBob, address(Alice))).toBe(
    groupKey
  );

  // Chris is not a member, he can not unwrap the key sent to Bob
  await expect(
    unwrapGroupKey(Chris.userAccount, forBob, address(Alice))
  ).rejects.toThrow();
});

it("Encrypts messages for every member of a group", async () => {
  const groupKey = createGroupKey();
  const forBob = await wrapGroupKey(Alice.userAccount, groupKey, address(Bob));
  const bobGroupKey = await unwrapGroupKey(
    Bob.userAccount,
    forBob,
    address(Alice)
  );

  const payload = encryptForGroup(groupKey, "hello group");
  expect(decryptForGroup(bobGroupKey, payload)).toBe("hello group");
  expect(() => decryptForGroup(createGroupKey(), payload)).toThrow();
});

it("Rejects wrapped values that are not group keys", async () => {
  const notAKey = await Alice.userAccount.nip44Encrypt(address(Bob), "hello");
  await expect(
    unwrapGroupKey(Bob.userAccount, notAKey, address(Alice))
  ).rejects.toThrow("Invalid group key");
});

it("Rejects tampered payloads", async () => {
  const payload = await Alice.userAccount.nip44Encrypt(address(Bob), "hi");
  const tampered =
    payload.slice(0, 50) +
    (payload[50] === "A" ? "B" : "A") +
    payload.slice(51);
  await expect(
    Bob.userAccount.nip44Decrypt(address(Alice), tampered)
  ).rejects.toThrow();
});

it("Needs a signer that supports encryption", async () => {
  const user = new ToolDbUserAdapter(Alice);
  await expect(user.nip44Encrypt(address(Bob), "hi")).rejects.toThrow();
});
