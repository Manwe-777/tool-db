// Names backed by domains (name@domain), as defined in NIP-05

const NAME = /^[a-z0-9\-_.]+$/i;

export interface Nip05Identifier {
  name: string;
  domain: string;
}

export interface Nip05Result {
  pubkey: string;
  relays: string[];
}

export type FetchLike = (
  url: string,
  init?: { redirect?: "error" }
) => Promise<{ ok: boolean; json(): Promise<any> }>;

/**
 * Splits an identifier in name and domain. A bare domain is "_@domain".
 */
export function parseNip05(identifier: string): Nip05Identifier | undefined {
  const [name, domain, ...rest] = identifier.includes("@")
    ? identifier.split("@")
    : ["_", identifier];
  if (rest.length > 0 || !name || !domain) return undefined;
  if (!NAME.test(name) || !/^[a-z0-9\-.]+(:\d+)?$/i.test(domain)) {
    return undefined;
  }
  return { name: name.toLowerCase(), domain: domain.toLowerCase() };
}

/**
 * Finds the public key (and relays) of an identifier, from the domain's
 * /.well-known/nostr.json
 * @returns undefined if the identifier is invalid or not found
 */
export async function resolveNip05(
  identifier: string,
  // Called through globalThis, browsers reject a detached fetch
  fetchFn: FetchLike = (url, init) => (globalThis as any).fetch(url, init)
): Promise<Nip05Result | undefined> {
  const parsed = parseNip05(identifier);
  if (!parsed) return undefined;

  try {
    // Redirects must not be followed (NIP-05)
    const response = await fetchFn(
      `https://${
        parsed.domain
      }/.well-known/nostr.json?name=${encodeURIComponent(parsed.name)}`,
      { redirect: "error" }
    );
    if (!response.ok) return undefined;

    const data = await response.json();
    const pubkey = data?.names?.[parsed.name];
    if (typeof pubkey !== "string" || !/^[0-9a-f]{64}$/.test(pubkey)) {
      return undefined;
    }

    const relays = data?.relays?.[pubkey];
    return {
      pubkey,
      relays: Array.isArray(relays)
        ? relays.filter((relay) => typeof relay === "string")
        : [],
    };
  } catch (e) {
    return undefined;
  }
}

/**
 * Whether the identifier belongs to the public key
 */
export async function verifyNip05(
  identifier: string,
  pubkey: string,
  fetchFn?: FetchLike
): Promise<boolean> {
  const result = await resolveNip05(identifier, fetchFn);
  return result?.pubkey === pubkey;
}
