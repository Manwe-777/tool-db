export const CRDT_MAP = "MAP";

export const CRDT_LIST = "LIST";

export const CRDT_COUNTER = "COUNTER";

export default class BaseCrdt<T = any, Changes = any, Value = any> {
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
