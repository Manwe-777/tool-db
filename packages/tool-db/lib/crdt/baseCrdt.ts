export const CRDT_MAP = "MAP";

export const CRDT_LIST = "LIST";

export const CRDT_COUNTER = "COUNTER";

export const CRDT_TYPES = [CRDT_MAP, CRDT_LIST, CRDT_COUNTER];

export class BaseCrdt<T = any, Changes = any, Value = any> {
  public type: string = "";

  public mergeChanges(changes: Changes[]) {
    //
  }

  public getChanges(): Changes[] {
    return [];
  }

  get value(): Value {
    return "" as any;
  }
}

const isObject = (value: any) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns the author of a change, or undefined if the change is not valid
 * for the given CRDT type.
 */
export function getChangeAuthor(type: string, change: any): string | undefined {
  if (!isObject(change)) return undefined;

  if (type === CRDT_MAP) {
    if (change.t !== "SET" && change.t !== "DEL") return undefined;
    if (typeof change.k !== "string" || typeof change.i !== "number") {
      return undefined;
    }
    return typeof change.a === "string" ? change.a : undefined;
  }

  if (type === CRDT_COUNTER) {
    if (change.t !== "ADD" && change.t !== "SUB") return undefined;
    if (typeof change.v !== "number" || !isFinite(change.v)) return undefined;
    if (typeof change.i !== "number") return undefined;
    return typeof change.a === "string" ? change.a : undefined;
  }

  if (type === CRDT_LIST) {
    if (change.t !== "INS" && change.t !== "DEL") return undefined;
    if (change.t === "DEL" && typeof change.v !== "string") return undefined;
    if (typeof change.i !== "string") return undefined;
    // List indexes are "author-sequence"
    const separator = change.i.lastIndexOf("-");
    return separator > 0 ? change.i.slice(0, separator) : undefined;
  }

  return undefined;
}
