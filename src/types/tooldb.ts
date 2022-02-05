import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { ToolDb, ToolDbMessage } from "..";

export class ToolDbNetworkAdapter {
  constructor(db: ToolDb) {
    //
  }

  public close(clientId: string): void {
    //
  }

  public sendToAll(
    msg: ToolDbMessage,
    crossServerOnly = false,
    isRelay = false
  ) {
    //
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    //
  }
}

export interface Peer {
  topic: string;
  timestamp: number;
  host: string;
  port: number;
  pubkey: string;
  sig: string;
}

export interface ToolDbStore {
  start: () => void;
  put: (
    key: string,
    data: string,
    callback: (err: any | null, data?: string) => void
  ) => void;
  get: (
    key: string,
    callback: (err: any | null, data?: string) => void
  ) => void;
  query: (key: string) => Promise<string[]>;
}

export type ToolDbStorageAdapter = (dbName?: string) => ToolDbStore;

export type ToolDbMessageHandler = (
  this: ToolDb,
  message: ToolDbMessage,
  remotePeerId: string
) => void;

export interface ToolDbOptions {
  db: string;
  debug: boolean;
  peers: { host: string; port: number }[];
  maxRetries: number;
  triggerDebouce: number;
  wait: number;
  pow: number;
  server: boolean;
  httpServer: HTTPServer | HTTPSServer | undefined;
  host: string;
  port: number;
  storageName: string;
  networkAdapter: typeof ToolDbNetworkAdapter;
  storageAdapter: ToolDbStorageAdapter;
  id: string;
  topic: string;
  publicKey: CryptoKey | undefined;
  privateKey: CryptoKey | undefined;
  [extra: string]: any;
}

export interface ParsedKeys {
  skpub: string;
  skpriv: string;
  ekpub: string;
  ekpriv: string;
}

export interface Keys {
  pub: string;
  priv: string;
}

export type GenericObject = { [key: string]: any };

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
