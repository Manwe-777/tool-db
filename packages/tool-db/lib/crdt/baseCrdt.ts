// Version 2 types use signed change sets, see CRDT_SIGNING.md
export const CRDT_MAP = "MAP:2";

export const CRDT_LIST = "LIST:2";

export const CRDT_COUNTER = "COUNTER:2";

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
