import {
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  getPublicKey,
  getTagValue,
  NostrEvent,
  verifyEvent,
} from "../packages/tool-db";

// Created and signed with nostr-tools 2.10.4, to check interoperability
const SECRET_KEY =
  "5c0c523f52a5b6fad39ed2403092df8cebc36318b39383bca6c00808626fab3a";
const FIXTURE: NostrEvent = {
  kind: 30078,
  created_at: 1700000000,
  tags: [
    ["d", "topic:key"],
    ["t", "topic"],
  ],
  content: '{"hello":"wörld ✓","n":[1,2.5,null]}',
  pubkey: "87d3561f19b74adbe8bf840682992466068830a9d8c36b4a0c99d36f826cb6cb",
  id: "2314ea28fd507982716b0324c70ca3c864fea6f282dbf68575e0fcb6b49fae39",
  sig: "2fbec26e79781a5724c9850ac075d4775e2d1f9b1d7d9aac9f6248bb919573e2eafaf7d14d868ef3d2daa18fded15e00594d89f4e9fe2a5dc22b0202f4637137",
};

it("Computes the same public key and id as other Nostr libraries", () => {
  expect(getPublicKey(SECRET_KEY)).toBe(FIXTURE.pubkey);
  expect(getEventHash(FIXTURE.pubkey, FIXTURE)).toBe(FIXTURE.id);
});

it("Verifies events signed by other Nostr libraries", () => {
  expect(verifyEvent(FIXTURE)).toBe(true);
});

it("Signs events that verify", () => {
  const event = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "hello",
    },
    generateSecretKey()
  );
  expect(verifyEvent(event)).toBe(true);
});

it("Rejects tampered events", () => {
  expect(verifyEvent({ ...FIXTURE, content: "tampered" })).toBe(false);
  expect(verifyEvent({ ...FIXTURE, tags: [["d", "other:key"]] })).toBe(false);
  expect(verifyEvent({ ...FIXTURE, created_at: FIXTURE.created_at + 1 })).toBe(
    false
  );
  expect(verifyEvent({ ...FIXTURE, kind: 1 })).toBe(false);
});

it("Rejects events signed by another key", () => {
  // Valid id for the claimed pubkey, but signed by someone else
  const other = finalizeEvent(FIXTURE, generateSecretKey());
  expect(verifyEvent({ ...FIXTURE, sig: other.sig })).toBe(false);
});

it("Rejects malformed events", () => {
  expect(verifyEvent(null)).toBe(false);
  expect(verifyEvent({ ...FIXTURE, id: "abc" })).toBe(false);
  expect(verifyEvent({ ...FIXTURE, sig: FIXTURE.sig.toUpperCase() })).toBe(
    false
  );
  expect(verifyEvent({ ...FIXTURE, tags: [["d", 1]] })).toBe(false);
  expect(verifyEvent({ ...FIXTURE, created_at: 1.5 })).toBe(false);
});

it("Reads tag values", () => {
  expect(getTagValue(FIXTURE, "d")).toBe("topic:key");
  expect(getTagValue(FIXTURE, "x")).toBeUndefined();
});
