import ToolChain from "..";

export interface ParsedKeys {
  skpub: string;
  skpriv: string;
  ekpub: string;
  ekpriv: string;
}

export type GenericObject = { [key: string]: any };

export interface GraphEntryValue<T = any> {
  key: string; // Key/id
  pub: string;
  hash: string; // hash of JSON.stringify(value) + nonce
  sig: string; // signature
  timestamp: number; // Timestamp this was created
  nonce: number;
  value: T;
}

export type GraphBase = Record<string, GraphEntryValue>; // key: value

// Eventually pass this graph to the Gun constructor
// interface TypedGraph extends GraphBase {
//   userData: GraphEntryPointers<{ name: string; age: number }>;
//   rawData: GraphEntryValue<{ foo: string; var: number; arr: string[] }>;
// }

export interface UserRootData {
  keys: {
    skpub: string;
    skpriv: string;
    ekpub: string;
    ekpriv: string;
  };
  iv: string;
  pass: string;
}

declare global {
  interface Window {
    toolchain: ToolChain | undefined;
    chainData: any;
  }
}
