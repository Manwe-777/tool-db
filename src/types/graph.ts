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
