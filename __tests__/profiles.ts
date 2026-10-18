import {
  FetchLike,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  parseNip05,
  PROFILE_KIND,
  resolveNip05,
  ToolDb,
  verifyNip05,
  verifyProfileName,
} from "../packages/tool-db";

import { ToolDbRelay } from "../packages/nostr-relay";

jest.setTimeout(15000);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ALICE = getPublicKey(generateSecretKey());

/**
 * A fake domain serving /.well-known/nostr.json
 */
const fakeFetch =
  (domains: Record<string, any>): FetchLike =>
  async (url, init) => {
    expect(init?.redirect).toBe("error");
    const { hostname, pathname, searchParams } = new URL(url);
    const body = domains[hostname];
    if (pathname !== "/.well-known/nostr.json" || !body) {
      return { ok: false, json: async () => ({}) };
    }
    expect(searchParams.get("name")).toBeTruthy();
    return { ok: true, json: async () => body };
  };

const domains = {
  "example.com": {
    names: { alice: ALICE, _: ALICE, bad: "not a key" },
    relays: { [ALICE]: ["wss://relay.example.com"] },
  },
};

describe("NIP-05", () => {
  it("Parses identifiers", () => {
    expect(parseNip05("Alice@Example.com")).toEqual({
      name: "alice",
      domain: "example.com",
    });
    expect(parseNip05("example.com")).toEqual({
      name: "_",
      domain: "example.com",
    });
    expect(parseNip05("a@b@c")).toBeUndefined();
    expect(parseNip05("al ice@example.com")).toBeUndefined();
    expect(parseNip05("alice@exa/mple.com")).toBeUndefined();
  });

  it("Resolves identifiers to public keys and relays", async () => {
    expect(await resolveNip05("alice@example.com", fakeFetch(domains))).toEqual(
      {
        pubkey: ALICE,
        relays: ["wss://relay.example.com"],
      }
    );
    expect(await resolveNip05("example.com", fakeFetch(domains))).toEqual({
      pubkey: ALICE,
      relays: ["wss://relay.example.com"],
    });
  });

  it("Does not resolve unknown or invalid names", async () => {
    const fetchFn = fakeFetch(domains);
    expect(await resolveNip05("bob@example.com", fetchFn)).toBeUndefined();
    expect(await resolveNip05("bad@example.com", fetchFn)).toBeUndefined();
    expect(await resolveNip05("alice@unknown.com", fetchFn)).toBeUndefined();
    expect(
      await resolveNip05("alice@example.com", () =>
        Promise.reject(new Error("offline"))
      )
    ).toBeUndefined();
  });

  it("Verifies identifiers belong to a public key", async () => {
    const fetchFn = fakeFetch(domains);
    expect(await verifyNip05("alice@example.com", ALICE, fetchFn)).toBe(true);
    expect(
      await verifyNip05(
        "alice@example.com",
        getPublicKey(generateSecretKey()),
        fetchFn
      )
    ).toBe(false);
  });
});

describe("Profiles", () => {
  let relay: ToolDbRelay;
  let Alice: ToolDb;
  let Bob: ToolDb;

  const connect = async () => {
    const db = new ToolDb({ relays: [relay.url], topic: "profiles-test" });
    await new Promise<void>((resolve) => {
      db.onConnect = () => resolve();
    });
    return db;
  };

  beforeAll(async () => {
    relay = new ToolDbRelay({ topic: "profiles-test" });
    await relay.start();
    [Alice, Bob] = await Promise.all([connect(), connect()]);
  });

  afterAll(async () => {
    await Promise.all([Alice.close(), Bob.close()]);
    await relay.close();
  });

  it("Publishes and reads profiles", async () => {
    await Alice.putProfile({ name: "alice", about: "hi" });
    await Alice.putProfile({ name: "alice", about: "updated" });
    await wait(100);

    expect(await Bob.getProfile(Alice.userAccount.getAddress() || "")).toEqual({
      name: "alice",
      about: "updated",
    });
  });

  it("Returns null for users without a profile", async () => {
    expect(await Bob.getProfile(getPublicKey(generateSecretKey()))).toBeNull();
  });

  it("Ignores profiles signed by someone else", async () => {
    const victim = getPublicKey(generateSecretKey());
    // A valid event, but by another key, can not be the victim's profile
    const forged = finalizeEvent(
      {
        kind: PROFILE_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({ name: "victim" }),
      },
      generateSecretKey()
    );
    await Bob.relays.publish({ ...forged, pubkey: victim });
    await wait(100);

    expect(await Bob.getProfile(victim)).toBeNull();
  });

  it("Verifies the name of a profile", async () => {
    const pubkey = Alice.userAccount.getAddress() || "";
    await Alice.putProfile({ name: "alice", nip05: "alice@example.com" });
    await wait(100);
    const profile = await Bob.getProfile(pubkey);

    const ownDomain = { "example.com": { names: { alice: pubkey } } };
    expect(
      await verifyProfileName(profile!, pubkey, fakeFetch(ownDomain))
    ).toBe(true);
    // Anyone can claim a name, only the domain can confirm it
    expect(await verifyProfileName(profile!, pubkey, fakeFetch(domains))).toBe(
      false
    );
  });
});
