import BaseCrdt, { CRDT_MAP } from "./baseCrdt";

export type MapOperations = "SET" | "DEL";

export interface ChangeMapBase<T> {
  t: MapOperations;
  a: string;
  k: string;
  i: number;
}

export interface SetMapChange<T> extends ChangeMapBase<T> {
  t: "SET";
  v: T;
}

export interface DelMapChange<T> extends ChangeMapBase<T> {
  t: "DEL";
}

export type MapChanges<T> = SetMapChange<T> | DelMapChange<T>;

export default class MapCrdt<T> extends BaseCrdt<
  T,
  MapChanges<T>,
  Record<string, T>
> {
  public type = CRDT_MAP;

  private _changes: MapChanges<T>[] = [];

  private _author = "";

  private _value: Record<string, T> = {};

  private _keyIndex: Record<string, number> = {};

  private _lastUpdateSize: number = 0;

  constructor(author: string, changes?: MapChanges<T>[]) {
    super();
    this._author = author;
    if (changes) {
      this.mergeChanges(changes);
    }

    this.calculate();
  }

  changesSort(a: MapChanges<T>, b: MapChanges<T>) {
    if (a.i < b.i) return -1;
    if (a.i > b.i) return 1;
    if (a.t === "SET" && b.t === "DEL") return -1;
    if (a.t === "DEL" && b.t === "SET") return 1;
    if (a.a < b.a) return -1;
    if (a.a > b.a) return 1;
    return 0; // Should never be equal!
  }

  calculate() {
    const temp: Record<string, T> = {};
    // Only update if we have new changes
    if (Object.values(this._changes).length !== this._lastUpdateSize) {
      this._changes.sort(this.changesSort).forEach((change) => {
        // Here we apply the model properties
        // Since this is a KV store we dont need much logic,
        // except for the sorting of the changes. Then we just apply them.
        if (change.t === "SET") {
          temp[change.k] = change.v;
        } else if (change.t === "DEL") {
          delete temp[change.k];
        }
        this._keyIndex[change.k] = change.i;
      });
      this._lastUpdateSize = Object.values(temp).length;
      this._value = temp;
    }
  }

  get value(): Record<string, T> {
    this.calculate();
    return this._value;
  }

  public mergeChanges(newChanges: MapChanges<T>[]) {
    newChanges.forEach((change) => {
      // Filter by author and index
      const filtered = this._changes.filter(
        (c) => c.i === change.i && c.a === change.a && c.t === change.t
      );
      // Only add if there are not matches
      if (filtered.length === 0) {
        this._changes.push(change);
      }
    });
    this.calculate();
  }

  public getChanges(): MapChanges<T>[] {
    return this._changes;
  }

  public SET(key: string, value: T) {
    this._keyIndex[key] = (this._keyIndex[key] || 0) + 1;
    this._changes.push({
      t: "SET",
      k: key,
      a: this._author,
      v: value,
      i: this._keyIndex[key],
    });
  }

  public DEL(key: string) {
    this._keyIndex[key] = (this._keyIndex[key] || 0) + 1;
    this._changes.push({
      t: "DEL",
      k: key,
      a: this._author,
      i: this._keyIndex[key],
    });
  }
}
