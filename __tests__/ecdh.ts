import {
  generateECDHKeyPair,
  importECDHPublicKey,
  importECDHPrivateKey,
  deriveSharedKey,
  encryptWithKey,
  decryptWithKey,
  importAESKey,
  generateIv,
} from "../packages/ecdsa-user";

import { arrayBufferToHex } from "../packages/tool-db";

jest.setTimeout(10000);

describe("ECDH Key Generation", () => {
  it("Generates a valid ECDH key pair", async () => {
    const keyPair = await generateECDHKeyPair();

    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();

    // Keys should be hex strings
    expect(typeof keyPair.publicKey).toBe("string");
    expect(typeof keyPair.privateKey).toBe("string");

    // Public key in SPKI format is around 182 hex chars for P-256
    expect(keyPair.publicKey.length).toBeGreaterThan(100);
    // Private key in PKCS8 format is around 242 hex chars for P-256
    expect(keyPair.privateKey.length).toBeGreaterThan(100);
  });

  it("Generates unique key pairs", async () => {
    const keyPair1 = await generateECDHKeyPair();
    const keyPair2 = await generateECDHKeyPair();

    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
  });
});

describe("ECDH Key Import", () => {
  it("Imports ECDH public key from hex", async () => {
    const keyPair = await generateECDHKeyPair();
    const importedKey = await importECDHPublicKey(keyPair.publicKey);

    expect(importedKey).toBeDefined();
    expect(importedKey.type).toBe("public");
    expect(importedKey.algorithm.name).toBe("ECDH");
  });

  it("Imports ECDH private key from hex", async () => {
    const keyPair = await generateECDHKeyPair();
    const importedKey = await importECDHPrivateKey(keyPair.privateKey);

    expect(importedKey).toBeDefined();
    expect(importedKey.type).toBe("private");
    expect(importedKey.algorithm.name).toBe("ECDH");
  });
});

describe("ECDH Key Derivation", () => {
  it("Derives shared key between two parties", async () => {
    // Alice generates her key pair
    const aliceKeys = await generateECDHKeyPair();
    // Bob generates his key pair
    const bobKeys = await generateECDHKeyPair();

    // Import keys
    const alicePrivate = await importECDHPrivateKey(aliceKeys.privateKey);
    const alicePublic = await importECDHPublicKey(aliceKeys.publicKey);
    const bobPrivate = await importECDHPrivateKey(bobKeys.privateKey);
    const bobPublic = await importECDHPublicKey(bobKeys.publicKey);

    // Alice derives shared key using Bob's public key
    const aliceSharedKey = await deriveSharedKey(alicePrivate, bobPublic);
    // Bob derives shared key using Alice's public key
    const bobSharedKey = await deriveSharedKey(bobPrivate, alicePublic);

    expect(aliceSharedKey).toBeDefined();
    expect(bobSharedKey).toBeDefined();
    expect(aliceSharedKey.type).toBe("secret");
    expect(bobSharedKey.type).toBe("secret");

    // Both should be able to encrypt/decrypt the same message
    const testMessage = "Secret message";

    const aliceEncrypted = await encryptWithKey(testMessage, aliceSharedKey);
    const bobDecrypted = await decryptWithKey(aliceEncrypted, bobSharedKey);

    expect(bobDecrypted).toBe(testMessage);
  });
});

describe("AES-GCM Encryption", () => {
  it("Encrypts and decrypts with key", async () => {
    // Generate a random 256-bit key
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = arrayBufferToHex(keyBytes.buffer);
    const key = await importAESKey(keyHex);

    const plaintext = "Hello, this is a secret message!";

    const encrypted = await encryptWithKey(plaintext, key);
    expect(encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ct).toBeDefined();

    const decrypted = await decryptWithKey(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("Produces different ciphertext for same plaintext", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = arrayBufferToHex(keyBytes.buffer);
    const key = await importAESKey(keyHex);

    const plaintext = "Same message";

    const encrypted1 = await encryptWithKey(plaintext, key);
    const encrypted2 = await encryptWithKey(plaintext, key);

    // Different IVs should produce different ciphertexts
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.ct).not.toBe(encrypted2.ct);

    // But both should decrypt to the same plaintext
    const decrypted1 = await decryptWithKey(encrypted1, key);
    const decrypted2 = await decryptWithKey(encrypted2, key);

    expect(decrypted1).toBe(plaintext);
    expect(decrypted2).toBe(plaintext);
  });

  it("Handles empty string encryption", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = arrayBufferToHex(keyBytes.buffer);
    const key = await importAESKey(keyHex);

    const plaintext = "";

    const encrypted = await encryptWithKey(plaintext, key);
    const decrypted = await decryptWithKey(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it("Handles large messages", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = arrayBufferToHex(keyBytes.buffer);
    const key = await importAESKey(keyHex);

    // 10KB message
    const plaintext = "A".repeat(10000);

    const encrypted = await encryptWithKey(plaintext, key);
    const decrypted = await decryptWithKey(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it("Fails to decrypt with wrong key", async () => {
    const key1Bytes = crypto.getRandomValues(new Uint8Array(32));
    const key2Bytes = crypto.getRandomValues(new Uint8Array(32));

    const key1 = await importAESKey(arrayBufferToHex(key1Bytes.buffer));
    const key2 = await importAESKey(arrayBufferToHex(key2Bytes.buffer));

    const plaintext = "Secret message";
    const encrypted = await encryptWithKey(plaintext, key1);

    // Decrypting with wrong key should fail
    await expect(decryptWithKey(encrypted, key2)).rejects.toThrow();
  });
});

describe("AES Key Import", () => {
  it("Imports 256-bit key from hex", async () => {
    const keyHex = "0".repeat(64); // 256 bits = 32 bytes = 64 hex chars
    const key = await importAESKey(keyHex);

    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });
});

describe("IV Generation", () => {
  it("Generates 12-byte IV", () => {
    const iv = generateIv();

    expect(iv).toBeDefined();
    expect(iv.length).toBe(12);
    expect(iv instanceof Uint8Array).toBe(true);
  });

  it("Generates unique IVs", () => {
    const iv1 = generateIv();
    const iv2 = generateIv();

    // Convert to arrays for comparison
    const arr1 = Array.from(iv1);
    const arr2 = Array.from(iv2);

    expect(arr1).not.toEqual(arr2);
  });
});

