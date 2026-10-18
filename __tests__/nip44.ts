import {
  calcPaddedLen,
  getConversationKey,
  getPublicKey,
  nip44Decrypt,
  nip44Encrypt,
  sha256,
} from "../packages/tool-db";

// Official test vectors, from https://github.com/paulmillr/nip44
import vectors from "./fixtures/nip44.vectors.json";

const { valid, invalid } = vectors.v2;

it("Derives conversation keys", () => {
  valid.get_conversation_key.forEach(({ sec1, pub2, conversation_key }) => {
    expect(getConversationKey(sec1, pub2)).toBe(conversation_key);
  });
});

it("Rejects invalid keys", () => {
  invalid.get_conversation_key.forEach(({ sec1, pub2 }) => {
    expect(() => getConversationKey(sec1, pub2)).toThrow();
  });
});

it("Pads messages", () => {
  valid.calc_padded_len.forEach(([length, padded]) => {
    expect(calcPaddedLen(length)).toBe(padded);
  });
});

it("Encrypts and decrypts messages", () => {
  valid.encrypt_decrypt.forEach(
    ({ sec1, sec2, conversation_key, nonce, plaintext, payload }) => {
      // The conversation key is the same from both sides
      expect(getConversationKey(sec1, getPublicKey(sec2))).toBe(
        conversation_key
      );
      expect(getConversationKey(sec2, getPublicKey(sec1))).toBe(
        conversation_key
      );

      expect(nip44Encrypt(plaintext, conversation_key, nonce)).toBe(payload);
      expect(nip44Decrypt(payload, conversation_key)).toBe(plaintext);
    }
  );
});

it("Encrypts long messages", () => {
  valid.encrypt_decrypt_long_msg.forEach(
    ({
      conversation_key,
      nonce,
      pattern,
      repeat,
      plaintext_sha256,
      payload_sha256,
    }) => {
      const plaintext = pattern.repeat(repeat);
      expect(sha256(plaintext)).toBe(plaintext_sha256);

      const payload = nip44Encrypt(plaintext, conversation_key, nonce);
      expect(sha256(payload)).toBe(payload_sha256);
      expect(nip44Decrypt(payload, conversation_key)).toBe(plaintext);
    }
  );
});

it("Rejects messages that are too short or too long", () => {
  const key = valid.encrypt_decrypt[0].conversation_key;
  invalid.encrypt_msg_lengths.forEach((length) => {
    expect(() => nip44Encrypt("a".repeat(length), key)).toThrow();
  });
});

it("Rejects invalid payloads", () => {
  invalid.decrypt.forEach(({ conversation_key, payload }) => {
    expect(() => nip44Decrypt(payload, conversation_key)).toThrow();
  });
});

it("Uses a random nonce by default", () => {
  const key = valid.encrypt_decrypt[0].conversation_key;
  expect(nip44Encrypt("same", key)).not.toBe(nip44Encrypt("same", key));
});
