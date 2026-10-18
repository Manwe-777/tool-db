import { NostrEvent, getTagValue } from "./event";

/**
 * A subscription filter (NIP-01). Tag filters use `#<letter>` keys.
 */
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [tag: `#${string}`]: string[] | undefined;
}

export function matchFilter(filter: NostrFilter, event: NostrEvent): boolean {
  if (filter.ids && !filter.ids.includes(event.id)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since !== undefined && event.created_at < filter.since) {
    return false;
  }
  if (filter.until !== undefined && event.created_at > filter.until) {
    return false;
  }

  return Object.keys(filter).every((key) => {
    if (key[0] !== "#") return true;
    const values = filter[key as `#${string}`] || [];
    const name = key.slice(1);
    return event.tags.some((tag) => tag[0] === name && values.includes(tag[1]));
  });
}

export function matchFilters(
  filters: NostrFilter[],
  event: NostrEvent
): boolean {
  return filters.some((filter) => matchFilter(filter, event));
}

export type EventKindType =
  | "regular"
  | "replaceable"
  | "ephemeral"
  | "addressable";

/**
 * How relays store each kind of event (NIP-01)
 */
export function getKindType(kind: number): EventKindType {
  if (kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000)) {
    return "replaceable";
  }
  if (kind >= 20000 && kind < 30000) return "ephemeral";
  if (kind >= 30000 && kind < 40000) return "addressable";
  return "regular";
}

/**
 * Events that replace each other share this address: kind and pubkey for
 * replaceable events, plus the `d` tag for addressable events.
 * Returns undefined for events that do not replace others.
 */
export function getReplaceableAddress(event: NostrEvent): string | undefined {
  const type = getKindType(event.kind);
  if (type === "replaceable") return `${event.kind}:${event.pubkey}`;
  if (type === "addressable") {
    return `${event.kind}:${event.pubkey}:${getTagValue(event, "d") || ""}`;
  }
  return undefined;
}

/**
 * Whether event `a` should replace event `b`: newest wins, ties go to the
 * lowest id (NIP-01).
 */
export function isNewerEvent(a: NostrEvent, b: NostrEvent): boolean {
  if (a.created_at !== b.created_at) return a.created_at > b.created_at;
  return a.id < b.id;
}
