import BaseCrdt, { CRDT_LIST } from "./baseCrdt";

export type CounterOperations = "ADD" | "SUB";

export interface ChangeCounterBase {
  t: CounterOperations; // Operation type
  v: number; // Value
  a: string;
  i: number;
}

export interface AddCounterChange extends ChangeCounterBase {
  t: "ADD";
}

export interface SubCounterChange extends ChangeCounterBase {
  t: "SUB";
}

export type CounterChanges = AddCounterChange | SubCounterChange;

export default class CounterCrdt<T> extends BaseCrdt<
  number,
  CounterChanges,
  number
> {
  public type = CRDT_LIST;

  public _changes: CounterChanges[] = [];

  private _author = "";

  private _value: number = 0;

  private _lastUpdateSize: number = 0;

  constructor(author: string, changes?: CounterChanges[]) {
    super();
    this._author = author;
    if (changes) {
      this.mergeChanges(changes);
    }

    this.calculate();
  }

  changesSort(a: CounterChanges, b: CounterChanges) {
    if (a.i > b.i) return 1;
    if (a.i < b.i) return -1;
    return 0; // Should never be equal!
  }

  calculate() {
    let temp: number = 0;
    // Only update if we have new changes
    if (Object.values(this._changes).length !== this._lastUpdateSize) {
      this._changes.sort(this.changesSort).forEach((change) => {
        if (change.t === "ADD") {
          temp += change.v;
        } else if (change.t === "SUB") {
          temp -= change.v;
        }
      });

      this._value = temp;
    }
  }

  get value(): number {
    this.calculate();
    return this._value;
  }

  public mergeChanges(newChanges: CounterChanges[]) {
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

  public getChanges(): CounterChanges[] {
    return this._changes;
  }

  public ADD(value: number) {
    const ourChanges = this._changes.filter((c) => c.a === this._author);

    this._changes.push({
      t: "ADD",
      v: value,
      a: this._author,
      i: ourChanges.length,
    });
    this.calculate();
  }

  public SUB(value: number) {
    const ourChanges = this._changes.filter((c) => c.a === this._author);

    this._changes.push({
      t: "SUB",
      v: value,
      a: this._author,
      i: ourChanges.length,
    });
    this.calculate();
  }
}
