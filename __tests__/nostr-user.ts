import { ToolDb, verifyEvent, VerifyResult } from "../packages/tool-db";

import ToolDbNostrUser, {
  decryptSecretKey,
  encryptSecretKey,
  npubEncode,
  nsecDecode,
  nsecEncode,
} from "../packages/nostr-user";

// Fixtures created with nostr-tools 2.10.4, to check interoperability
const SECRET_KEY =
  "5c0c523f52a5b6fad39ed2403092df8cebc36318b39383bca6c00808626fab3a";
const PUBLIC_KEY =
  "87d3561f19b74adbe8bf840682992466068830a9d8c36b4a0c99d36f826cb6cb";
const NSEC = "nsec1tsx9y06j5km045u76fqrpykl3n4uxccckwfc809xcqyqscn04vaq02ch55";
const NPUB = "npub1slf4v8ceka9dh69lssrg9xfyvcrgsv9fmrpkkjsvn8fklqnvkm9s65qu2t";
const NCRYPTSEC =
  "ncryptsec1qg92xa5ll57c9j2acjw3aprwr0mz7f4ze9t2xlgalsuzm94fmu6hmjsvpjq55npmaa9qz7an5tc0emvaer73w6fjmml5xe453s2mhgu9ywhrszz00p767zwrsz5ff42wv3pht45q2wgl6wz7py76d05r";
const NCRYPTSEC_PASSWORD = "pässword ✓";

// Keep tests fast, the default cost is much higher
ToolDbNostrUser.encryptionLogN = 10;

let db: ToolDb;

beforeAll(async () => {
  db = new ToolDb({ userAdapter: ToolDbNostrUser });
  await db.ready;
});

it("Encodes keys like other Nostr libraries (NIP-19)", () => {
  expect(nsecEncode(SECRET_KEY)).toBe(NSEC);
  expect(npubEncode(PUBLIC_KEY)).toBe(NPUB);
  expect(nsecDecode(NSEC)).toBe(SECRET_KEY);
});

it("Decrypts keys encrypted by other Nostr libraries (NIP-49)", async () => {
  expect(await decryptSecretKey(NCRYPTSEC, NCRYPTSEC_PASSWORD)).toBe(
    SECRET_KEY
  );
});

it("Encrypts and decrypts secret keys", async () => {
  const encrypted = await encryptSecretKey(SECRET_KEY, "password", 10);
  expect(encrypted.startsWith("ncryptsec1")).toBe(true);
  expect(await decryptSecretKey(encrypted, "password")).toBe(SECRET_KEY);
  await expect(decryptSecretKey(encrypted, "wrong")).rejects.toThrow();
});

it("Uses the public key as address", async () => {
  const user = new ToolDbNostrUser(db);
  await user.setUser(NSEC, "name");

  expect(user.getAddress()).toBe(PUBLIC_KEY);
  expect(user.npub).toBe(NPUB);
  expect(user.getUsername()).toBe("name");
  expect(user.exportSecretKey()).toBe(NSEC);
});

it("Accepts secret keys as hex or nsec", async () => {
  const user = new ToolDbNostrUser(db);
  await user.setUser(await user.getAccountFromPrivate(SECRET_KEY), "hex");
  expect(user.getAddress()).toBe(PUBLIC_KEY);

  await expect(user.getAccountFromPrivate("not a key")).rejects.toThrow();
});

it("Generates a new identity for anonymous users", async () => {
  const user = new ToolDbNostrUser(db);
  const first = user.getAddress();
  await user.anonUser();
  expect(user.getAddress()).not.toBe(first);
  expect(user.getAddress()).toMatch(/^[0-9a-f]{64}$/);
});

it("Signs events", async () => {
  const user = new ToolDbNostrUser(db);
  const event = await user.signEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: "hello",
  });

  expect(event.pubkey).toBe(user.getAddress());
  expect(verifyEvent(event)).toBe(true);
});

it("Signs and verifies data", async () => {
  const user = new ToolDbNostrUser(db);
  const h = "a".repeat(64);
  const s = await user.signData(h);

  expect(await user.verifySignature({ h, a: user.getAddress(), s })).toBe(true);
  expect(
    await user.verifySignature({ h: "b".repeat(64), a: user.getAddress(), s })
  ).toBe(false);
  expect(await user.verifySignature({ h, a: PUBLIC_KEY, s })).toBe(false);
  expect(await user.verifySignature({ h, a: "not hex", s })).toBe(false);
});

it("Encrypts and restores accounts", async () => {
  const user = new ToolDbNostrUser(db);
  await user.setUser(SECRET_KEY, "restored");

  const encrypted = await user.encryptAccount("password");
  const account = await user.decryptAccount(encrypted, "password");

  const restored = new ToolDbNostrUser(db);
  await restored.setUser(account, account.name || "");
  expect(restored.getAddress()).toBe(PUBLIC_KEY);
  expect(restored.getUsername()).toBe("restored");
});

it("Works as the identity of a database", async () => {
  // Messages signed with Nostr keys verify with the existing core
  await db.anonSignIn();
  const message = await db.putData("nostr-user-key", "value");
  expect(message).not.toBeNull();
  expect(await db.verifyMessage(message!.data)).toBe(VerifyResult.Verified);
});
