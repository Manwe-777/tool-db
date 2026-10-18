import {
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  getConversationKey,
  getPublicKey,
  nip44Decrypt,
  nip44Encrypt,
  Nip07Signer,
  ToolDb,
  ToolDbNip07User,
  verifyEvent,
} from "../packages/tool-db";

/**
 * A fake browser extension holding a secret key, like window.nostr
 */
const createExtension = (secretKey = generateSecretKey()): Nip07Signer => ({
  getPublicKey: async () => getPublicKey(secretKey),
  signEvent: async (event: EventTemplate) => finalizeEvent(event, secretKey),
  nip44: {
    encrypt: async (publicKey, plaintext) =>
      nip44Encrypt(plaintext, getConversationKey(secretKey, publicKey)),
    decrypt: async (publicKey, payload) =>
      nip44Decrypt(payload, getConversationKey(secretKey, publicKey)),
  },
});

const setExtension = (extension: Nip07Signer | undefined) => {
  (globalThis as any).nostr = extension;
};

afterEach(() => setExtension(undefined));

const createDb = async () => {
  const db = new ToolDb({ userAdapter: ToolDbNip07User });
  await db.ready;
  return db;
};

it("Uses the public key of the extension", async () => {
  const secretKey = generateSecretKey();
  setExtension(createExtension(secretKey));

  const db = await createDb();
  expect(db.userAccount.getAddress()).toBe(getPublicKey(secretKey));
  await db.close();
});

it("Signs data with the extension", async () => {
  setExtension(createExtension());
  const db = await createDb();

  const event = await db.putData("nip07-key", "value");
  expect(verifyEvent(event)).toBe(true);
  expect(event.pubkey).toBe(db.userAccount.getAddress());
  expect(await db.getData("nip07-key")).toBe("value");
  await db.close();
});

it("Rejects events the extension changed", async () => {
  const extension = createExtension();
  setExtension({
    ...extension,
    // Signs something else than what was asked
    signEvent: (event) =>
      extension.signEvent({ ...event, content: JSON.stringify("changed") }),
  });
  const db = await createDb();

  await expect(db.putData("nip07-changed", "value")).rejects.toThrow(
    "The extension returned an invalid event"
  );
  await db.close();
});

it("Rejects events signed by another key", async () => {
  const extension = createExtension();
  const other = createExtension();
  setExtension({ ...extension, signEvent: other.signEvent });
  const db = await createDb();

  await expect(db.putData("nip07-other", "value")).rejects.toThrow(
    "The extension returned an invalid event"
  );
  await db.close();
});

it("Fails to sign when the user declines", async () => {
  setExtension({
    ...createExtension(),
    signEvent: () => Promise.reject(new Error("User declined")),
  });
  const db = await createDb();

  await expect(db.putData("nip07-declined", "value")).rejects.toThrow(
    "User declined"
  );
  await db.close();
});

it("Encrypts with the extension", async () => {
  setExtension(createExtension());
  const db = await createDb();
  const other = new ToolDb();

  const payload = await db.userAccount.nip44Encrypt(
    other.userAccount.getAddress() || "",
    "secret"
  );
  expect(
    await other.userAccount.nip44Decrypt(
      db.userAccount.getAddress() || "",
      payload
    )
  ).toBe("secret");
  await Promise.all([db.close(), other.close()]);
});

it("Can not create or import identities", async () => {
  setExtension(createExtension());
  const db = await createDb();

  await expect(db.anonSignIn()).rejects.toThrow();
  await expect(db.keysSignIn(generateSecretKey())).rejects.toThrow();
  await db.close();
});

it("Is not ready without an extension", async () => {
  const db = new ToolDb({ userAdapter: ToolDbNip07User });
  await expect(db.ready).rejects.toThrow("No Nostr browser extension");
  await db.close();
});
