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
  adress: string;
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
  /**
   * Database name to use
   */
  db: string;
  /**
   * Show debug console logs
   */
  debug: boolean;
  /**
   * Array of peers to connect to
   */
  peers: { host: string; port: number }[];
  /**
   * Max number of tries when a connection fails
   */
  maxRetries: number;
  /**
   * How long to wait (max) for a debounced key listener recv
   */
  triggerDebouce: number;
  /**
   * How long to wait between retries
   */
  wait: number;
  /**
   * Port to listen incoming connections (server only)
   */
  pow: number;
  /**
   * Whether we are a server or not
   */
  server: boolean;
  /**
   * A server instance like Express (server only)
   */
  httpServer: HTTPServer | HTTPSServer | undefined;
  /**
   * Our hostname (server only)
   */
  host: string;
  /**
   * Port to listen incoming connections (server only, default is 8080)
   */
  port: number;
  /**
   * Our storage namespace (default is "tooldb")
   */
  storageName: string;
  /**
   * A custom network adapter class
   */
  networkAdapter: typeof ToolDbNetworkAdapter;
  /**
   * A custom storage adapter function
   */
  storageAdapter: ToolDbStorageAdapter;
  /**
   * Our client ID (defaults to a generated publicKey)
   */
  id: string;
  /**
   * The namespace/topic of our app (default is "tool-db-default")
   */
  topic: string;
  /**
   * Public and private (ECDSA) keys of our client.
   * In the default network adapter these are used to sign
   */
  publicKey: CryptoKey | undefined;
  /**
   * our messages as we join and leave the network,
   * public key should match the client ID (as a base64 exported string)
   */
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
