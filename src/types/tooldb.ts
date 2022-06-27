import _ from "lodash";
import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import ToolDb from "../tooldb";
import { ToolDbMessage } from "./message";
import ToolDbNetworkAdapter from "../adapters-base/networkAdapter";
import ToolDbStorageAdapter from "../adapters-base/storageAdapter";
import ToolDbUserAdapter from "../adapters-base/userAdapter";

export interface Peer {
  topic: string;
  timestamp: number;
  host: string;
  port: number;
  adress: string;
  sig: string;
}

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
  storageAdapter: typeof ToolDbStorageAdapter;
  /**
   * A custom user storage and validation adapter class
   */
  userAdapter: typeof ToolDbUserAdapter;
  /**
   * The namespace/topic of our app (default is "tool-db-default")
   */
  topic: string;
  // [extra: string]: any;
}
