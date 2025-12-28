import {
  generateECDHKeyPair,
  wrapGroupKey,
  unwrapGroupKey,
  importAESKey,
  encryptWithKey,
  decryptWithKey,
} from "../packages/ecdsa-user";

import { generateGroupKey } from "../packages/tool-db";

jest.setTimeout(10000);

describe("Group Key Generation", () => {
  it("Generates a 256-bit group key", () => {
    const groupKey = generateGroupKey();

    expect(groupKey).toBeDefined();
    expect(typeof groupKey).toBe("string");
    // 256 bits = 32 bytes = 64 hex characters
    expect(groupKey.length).toBe(64);
    // Should be valid hex
    expect(/^[0-9a-f]+$/i.test(groupKey)).toBe(true);
  });

  it("Generates unique group keys", () => {
    const key1 = generateGroupKey();
    const key2 = generateGroupKey();
    const key3 = generateGroupKey();

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it("Generated key can be used for AES encryption", async () => {
    const groupKey = generateGroupKey();
    const aesKey = await importAESKey(groupKey);

    const plaintext = "Test message";
    const encrypted = await encryptWithKey(plaintext, aesKey);
    const decrypted = await decryptWithKey(encrypted, aesKey);

    expect(decrypted).toBe(plaintext);
  });
});

describe("Group Key Wrapping", () => {
  it("Wraps and unwraps group key between two users", async () => {
    // Alice creates a group and generates a group key
    const aliceKeys = await generateECDHKeyPair();
    const bobKeys = await generateECDHKeyPair();

    const groupKey = generateGroupKey();

    // Alice wraps the group key for Bob
    const wrappedForBob = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      bobKeys.publicKey
    );

    expect(wrappedForBob).toBeDefined();
    expect(wrappedForBob.iv).toBeDefined();
    expect(wrappedForBob.key).toBeDefined();

    // Bob unwraps the group key
    const unwrappedByBob = await unwrapGroupKey(
      wrappedForBob,
      bobKeys.privateKey,
      aliceKeys.publicKey
    );

    expect(unwrappedByBob).toBe(groupKey);
  });

  it("Wrapped key cannot be unwrapped by wrong user", async () => {
    const aliceKeys = await generateECDHKeyPair();
    const bobKeys = await generateECDHKeyPair();
    const eveKeys = await generateECDHKeyPair(); // Attacker

    const groupKey = generateGroupKey();

    // Alice wraps the group key for Bob
    const wrappedForBob = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      bobKeys.publicKey
    );

    // Eve tries to unwrap with her keys (should fail)
    await expect(
      unwrapGroupKey(wrappedForBob, eveKeys.privateKey, aliceKeys.publicKey)
    ).rejects.toThrow();
  });

  it("Wrapping same key produces different ciphertext", async () => {
    const aliceKeys = await generateECDHKeyPair();
    const bobKeys = await generateECDHKeyPair();

    const groupKey = generateGroupKey();

    const wrapped1 = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      bobKeys.publicKey
    );
    const wrapped2 = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      bobKeys.publicKey
    );

    // Different IVs should produce different wrapped keys
    expect(wrapped1.iv).not.toBe(wrapped2.iv);
    expect(wrapped1.key).not.toBe(wrapped2.key);

    // But both should unwrap to the same group key
    const unwrapped1 = await unwrapGroupKey(
      wrapped1,
      bobKeys.privateKey,
      aliceKeys.publicKey
    );
    const unwrapped2 = await unwrapGroupKey(
      wrapped2,
      bobKeys.privateKey,
      aliceKeys.publicKey
    );

    expect(unwrapped1).toBe(groupKey);
    expect(unwrapped2).toBe(groupKey);
  });

  it("Supports multi-member group key distribution", async () => {
    // Alice creates a group
    const aliceKeys = await generateECDHKeyPair();
    const bobKeys = await generateECDHKeyPair();
    const charlieKeys = await generateECDHKeyPair();

    const groupKey = generateGroupKey();

    // Alice wraps the group key for each member
    const wrappedForBob = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      bobKeys.publicKey
    );
    const wrappedForCharlie = await wrapGroupKey(
      groupKey,
      aliceKeys.privateKey,
      charlieKeys.publicKey
    );

    // Each member unwraps their copy
    const bobGroupKey = await unwrapGroupKey(
      wrappedForBob,
      bobKeys.privateKey,
      aliceKeys.publicKey
    );
    const charlieGroupKey = await unwrapGroupKey(
      wrappedForCharlie,
      charlieKeys.privateKey,
      aliceKeys.publicKey
    );

    // All should have the same group key
    expect(bobGroupKey).toBe(groupKey);
    expect(charlieGroupKey).toBe(groupKey);

    // All can encrypt/decrypt with the shared group key
    const aesKey = await importAESKey(groupKey);
    const message = "Hello group!";

    const encrypted = await encryptWithKey(message, aesKey);

    const bobAesKey = await importAESKey(bobGroupKey);
    const charlieAesKey = await importAESKey(charlieGroupKey);

    const bobDecrypted = await decryptWithKey(encrypted, bobAesKey);
    const charlieDecrypted = await decryptWithKey(encrypted, charlieAesKey);

    expect(bobDecrypted).toBe(message);
    expect(charlieDecrypted).toBe(message);
  });
});

describe("End-to-end group encryption flow", () => {
  it("Complete flow: create group, add members, encrypt messages", async () => {
    // Setup: Create three users
    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();
    const charlie = await generateECDHKeyPair();

    // Step 1: Alice creates a group and generates the group key
    const groupKey = generateGroupKey();

    // Step 2: Alice distributes the key to members
    const bobWrappedKey = await wrapGroupKey(
      groupKey,
      alice.privateKey,
      bob.publicKey
    );
    const charlieWrappedKey = await wrapGroupKey(
      groupKey,
      alice.privateKey,
      charlie.publicKey
    );

    // Step 3: Members unwrap their keys
    const bobKey = await unwrapGroupKey(
      bobWrappedKey,
      bob.privateKey,
      alice.publicKey
    );
    const charlieKey = await unwrapGroupKey(
      charlieWrappedKey,
      charlie.privateKey,
      alice.publicKey
    );

    // Step 4: Bob sends an encrypted message
    const bobAesKey = await importAESKey(bobKey);
    const bobMessage = "Hi everyone, this is Bob!";
    const encryptedMessage = await encryptWithKey(bobMessage, bobAesKey);

    // Step 5: Alice and Charlie decrypt the message
    const aliceAesKey = await importAESKey(groupKey);
    const charlieAesKey = await importAESKey(charlieKey);

    const aliceDecrypted = await decryptWithKey(encryptedMessage, aliceAesKey);
    const charlieDecrypted = await decryptWithKey(
      encryptedMessage,
      charlieAesKey
    );

    expect(aliceDecrypted).toBe(bobMessage);
    expect(charlieDecrypted).toBe(bobMessage);
  });
});

