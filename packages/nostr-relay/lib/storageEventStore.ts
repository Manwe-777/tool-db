import {
  NostrEvent,
  NostrFilter,
  ToolDbStorageAdapter,
  getKindType,
  getReplaceableAddress,
  isNewerEvent,
  matchFilter,
} from "tool-db";

import { EventStore } from "./eventStore";

// Wide enough for any created_at, so keys sort by time
const TIMESTAMP_DIGITS = 12;

const encode = (value: string) => encodeURIComponent(value);

const eventKey = (id: string) => `e/${id}`;

const addressKey = (address: string) => `r/${encode(address)}`;

/**
 * The indexes an event is listed in. Single letter tags are indexed, as
 * NIP-01 only requires filtering by those.
 */
function getIndexes(event: NostrEvent): string[] {
  const indexes = ["all", `kind/${event.kind}`, `author/${event.pubkey}`];
  event.tags.forEach((tag) => {
    if (tag[0]?.length === 1 && tag[1] !== undefined) {
      indexes.push(`tag/${tag[0]}/${encode(tag[1])}`);
    }
  });
  return indexes;
}

const indexKey = (index: string, event: NostrEvent) =>
  `i/${index}/${String(event.created_at).padStart(TIMESTAMP_DIGITS, "0")}/${
    event.id
  }`;

/**
 * The most selective index prefixes to find the events of a filter
 */
function getIndexPrefixes(filter: NostrFilter): string[] {
  const tagKey = Object.keys(filter).find((key) => key[0] === "#");
  if (tagKey) {
    const values = filter[tagKey as `#${string}`] || [];
    return values.map((value) => `i/tag/${tagKey.slice(1)}/${encode(value)}/`);
  }
  if (filter.authors) {
    return filter.authors.map((author) => `i/author/${author}/`);
  }
  if (filter.kinds) return filter.kinds.map((kind) => `i/kind/${kind}/`);
  return ["i/all/"];
}

/**
 * Event store on top of a ToolDB storage adapter (LevelDB, IndexedDB,
 * Redis, ...), with indexes by kind, author and tag.
 */
export class StorageEventStore implements EventStore {
  // Writes are serialized, so replacing events does not race
  private writes: Promise<unknown> = Promise.resolve();

  constructor(private store: ToolDbStorageAdapter) {}

  private async getEvent(id: string): Promise<NostrEvent | undefined> {
    try {
      return JSON.parse(await this.store.get(eventKey(id)));
    } catch (e) {
      return undefined;
    }
  }

  private async putEvent(event: NostrEvent) {
    await this.store.put(eventKey(event.id), JSON.stringify(event));
    await Promise.all(
      getIndexes(event).map((index) =>
        this.store.put(indexKey(index, event), "")
      )
    );
  }

  private async deleteEvent(event: NostrEvent) {
    await Promise.all(
      getIndexes(event).map((index) =>
        this.store.delete(indexKey(index, event))
      )
    );
    await this.store.delete(eventKey(event.id));
  }

  public add(event: NostrEvent): Promise<boolean> {
    const result = this.writes.then(() => this.addNow(event));
    this.writes = result.catch(() => undefined);
    return result;
  }

  private async addNow(event: NostrEvent): Promise<boolean> {
    if (getKindType(event.kind) === "ephemeral") return true;
    if (await this.getEvent(event.id)) return false;

    const address = getReplaceableAddress(event);
    if (address) {
      let current: NostrEvent | undefined;
      try {
        current = await this.getEvent(
          await this.store.get(addressKey(address))
        );
      } catch (e) {
        // nothing at this address yet
      }
      if (current && !isNewerEvent(event, current)) return false;
      if (current) await this.deleteEvent(current);
      await this.store.put(addressKey(address), event.id);
    }

    await this.putEvent(event);
    return true;
  }

  public async close(): Promise<void> {
    await this.writes;
    if (typeof (this.store as any).close === "function") {
      await (this.store as any).close();
    }
  }

  public async query(filters: NostrFilter[]): Promise<NostrEvent[]> {
    const found: Record<string, NostrEvent> = {};

    for (const filter of filters) {
      // Candidate event ids, newest first
      let candidates: string[];
      if (filter.ids) {
        candidates = filter.ids;
      } else {
        const keys = (
          await Promise.all(
            getIndexPrefixes(filter).map((prefix) => this.store.query(prefix))
          )
        ).reduce((all, list) => all.concat(list), []);

        candidates = keys
          .map((key) => {
            const parts = key.split("/");
            return {
              time: parts[parts.length - 2],
              id: parts[parts.length - 1],
            };
          })
          .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0))
          .map((candidate) => candidate.id);
      }

      let count = 0;
      for (const id of Array.from(new Set(candidates))) {
        if (filter.limit !== undefined && count >= filter.limit) break;
        const event = await this.getEvent(id);
        if (event && matchFilter(filter, event)) {
          found[event.id] = event;
          count += 1;
        }
      }
    }

    return Object.values(found).sort((a, b) => b.created_at - a.created_at);
  }
}
