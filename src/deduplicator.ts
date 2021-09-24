import { ToolDbMessage } from ".";

export interface DeduplicatedEntry {
  time: number;
}

export interface DupOptions {
  age: number;
  max: number;
}

export default class Deduplicator {
  private entries: Record<string, DeduplicatedEntry> = {};

  private timeout: null | number = null;

  private now: number = +new Date();

  private options: DupOptions = { max: 999, age: 1000 * 9 };

  constructor(opt: Partial<DupOptions> = {}) {
    this.options = { ...this.options, ...opt };
  }

  getEntry(id: string): DeduplicatedEntry {
    const it =
      this.entries[id] ||
      (this.entries[id] = {
        time: 0,
      });

    it.time = this.now = +new Date();

    if (!this.timeout) {
      this.timeout = setTimeout(this.drop, this.options.age + 9);
    }

    return it;
  }

  public check = (id: string): false | DeduplicatedEntry => {
    if (!this.entries[id]) {
      return false;
    }

    return this.getEntry(id);
  };

  public add = (id: string, _entry: ToolDbMessage): void => {
    this.entries[id] = {
      time: (this.now = +new Date()),
    };
  };

  public drop = (age: number): void => {
    this.timeout = null;
    this.now = +new Date();

    Object.keys(this.entries).forEach((_id) => {
      const it = this.entries[_id];

      if (it && (age || this.options.age) > this.now - it.time) {
        return;
      }
      delete this.entries[_id];
    });
  };
}
