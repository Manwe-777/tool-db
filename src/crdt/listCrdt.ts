import BaseCrdt, { CRDT_LIST } from "./baseCrdt";

export type ListOperations = "INS" | "DEL";

export interface ChangeListBase<T> {
  t: ListOperations; // Operation type
  i: string; // "index", author + n
}

export interface InsListChange<T> extends ChangeListBase<T> {
  t: "INS";
  v: T; // Value
  p: string | undefined; // Previous index, if any
  n: string | undefined; // Next index, if any
}

export interface DelListChange<T> extends ChangeListBase<T> {
  t: "DEL";
  v: string; // target index to tombstone
}

export type ListChanges<T> = InsListChange<T> | DelListChange<T>;

interface ListTempCursor<T> {
  value: T;
  index: string;
  tomb: boolean;
  prev: string | undefined;
  next: string | undefined;
}

export default class ListCrdt<T> extends BaseCrdt<T, ListChanges<T>, T[]> {
  public type = CRDT_LIST;

  public _changes: ListChanges<T>[] = [];

  private _author = "";

  private _value: T[] = [];

  public _tempValues: ListTempCursor<T>[] = [];

  private _lastUpdateSize: number = 0;

  constructor(author: string, changes?: ListChanges<T>[]) {
    super();
    this._author = author;
    if (changes) {
      this.mergeChanges(changes);
    }

    this.calculate();
  }

  changesSort(a: ListChanges<T>, b: ListChanges<T>) {
    if (a.i > b.i) return 1;
    if (a.i < b.i) return -1;
    return 0; // Should never be equal!
  }

  calculate() {
    const temp: ListTempCursor<T>[] = [];
    // Only update if we have new changes
    if (Object.values(this._changes).length !== this._lastUpdateSize) {
      this._changes.sort(this.changesSort).forEach((change) => {
        if (change.t === "INS") {
          let poisitionToInsert = 0;
          if (change.p) {
            poisitionToInsert = temp.findIndex((v) => v.index === change.p) + 1;
          } else if (change.n) {
            poisitionToInsert = temp.findIndex((v) => v.index === change.n);
          }

          const cursorValue: ListTempCursor<T> = {
            value: change.v,
            index: change.i,
            tomb: false,
            prev: change.p,
            next: change.n,
          };

          temp.splice(poisitionToInsert, 0, cursorValue);
        } else if (change.t === "DEL") {
          const poisitionToInsert = temp.findIndex((v) => v.index === change.v);
          temp[poisitionToInsert].tomb = true;
        }
      });
      this._lastUpdateSize = Object.values(temp).length;

      this._tempValues = temp;

      this._value = temp.filter((v) => !v.tomb).map((v) => v.value);
    }
  }

  get value(): T[] {
    this.calculate();
    return this._value;
  }

  public mergeChanges(newChanges: ListChanges<T>[]) {
    newChanges.forEach((change) => {
      // Filter by author and index
      const filtered = this._changes.filter(
        (c) => c.i === change.i && c.t === change.t && c.v === change.v
      );
      // Only add if there are not matches
      if (filtered.length === 0) {
        this._changes.push(change);
      }
    });
    this.calculate();
  }

  public getChanges(): ListChanges<T>[] {
    return this._changes;
  }

  public INS(value: T, index: number) {
    const filterTombs = this._tempValues.filter((v) => !v.tomb);

    let currentPrev = undefined;
    let currentNext = undefined;

    if (filterTombs.length !== 0) {
      const currentIndex = filterTombs[index].index;
      const currentIndexPosition = this._tempValues.findIndex(
        (v) => v.index === currentIndex
      );
      currentPrev = this._tempValues[currentIndexPosition - 1];
      currentNext = this._tempValues[currentIndexPosition];
    }

    const ourChanges = this._changes.filter((c) =>
      c.i.startsWith(this._author)
    );

    this._changes.push({
      t: "INS",
      p: currentPrev?.index,
      n: currentNext?.index,
      v: value,
      i: this._author + "-" + `${ourChanges.length}`.padStart(8, "0"),
    });
    this.calculate();
  }

  public PUSH(value: T) {
    const filterTombs = this._tempValues.filter((v) => !v.tomb);
    const currentIndex = filterTombs[filterTombs.length - 1]?.index;
    const currentIndexPosition = this._tempValues.findIndex(
      (v) => v.index === currentIndex
    );

    const currentPrev = this._tempValues[currentIndexPosition];

    const ourChanges = this._changes.filter((c) =>
      c.i.startsWith(this._author)
    );

    this._changes.push({
      t: "INS",
      p: currentPrev?.index,
      n: undefined,
      v: value,
      i: this._author + "-" + `${ourChanges.length}`.padStart(8, "0"),
    });
    this.calculate();
  }

  public DEL(index: number) {
    const currentIndex = this._tempValues.filter((v) => !v.tomb)[index].index;
    const currentIndexPosition = this._tempValues.findIndex(
      (v) => v.index === currentIndex
    );

    const current = this._tempValues[currentIndexPosition];

    const ourChanges = this._changes.filter((c) =>
      c.i.startsWith(this._author)
    );

    this._changes.push({
      t: "DEL",
      v: current.index,
      i: this._author + "-" + `${ourChanges.length}`.padStart(8, "0"),
    });
    this.calculate();
  }
}
