import {
  NostrEvent,
  NostrFilter,
  getKindType,
  getReplaceableAddress,
  isNewerEvent,
  matchFilter,
} from "tool-db";

export interface EventStore {
  /**
   * Stores an event, following the rules of its kind.
   * @returns false if the event was a duplicate or older than the stored one
   */
  add(event: NostrEvent): Promise<boolean>;
  /**
   * Returns the stored events matching any of the filters, newest first
   */
  query(filters: NostrFilter[]): Promise<NostrEvent[]>;
}

const newestFirst = (a: NostrEvent, b: NostrEvent) =>
  b.created_at - a.created_at;

/**
 * Event store kept in memory, useful for tests and ephemeral relays
 */
export class MemoryEventStore implements EventStore {
  private events: Record<string, NostrEvent> = {};

  private addresses: Record<string, string> = {};

  public async add(event: NostrEvent): Promise<boolean> {
    if (getKindType(event.kind) === "ephemeral") return true;
    if (this.events[event.id]) return false;

    const address = getReplaceableAddress(event);
    if (address) {
      const current = this.events[this.addresses[address]];
      if (current && !isNewerEvent(event, current)) return false;
      if (current) delete this.events[current.id];
      this.addresses[address] = event.id;
    }

    this.events[event.id] = event;
    return true;
  }

  public async query(filters: NostrFilter[]): Promise<NostrEvent[]> {
    const all = Object.values(this.events).sort(newestFirst);

    const found: Record<string, NostrEvent> = {};
    filters.forEach((filter) => {
      const matches = all.filter((event) => matchFilter(filter, event));
      const limited =
        filter.limit !== undefined ? matches.slice(0, filter.limit) : matches;
      limited.forEach((event) => {
        found[event.id] = event;
      });
    });

    return Object.values(found).sort(newestFirst);
  }
}
