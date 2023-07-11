import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";

import {
  ToolDb,
  ToolDbMessage,
  ToolDbNetworkAdapter,
  ToolDbStorageAdapter,
  ToolDbUserAdapter,
} from "..";

export interface Peer {
  topic: string;
  timestamp: number;
  host: string;
  port: number;
  address: string;
  sig: string;
}

export type ToolDbMessageHandler = (
  this: ToolDb,
  message: ToolDbMessage,
  remotePeerId: string
) => void;

export interface ToolDbOptions {
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
   * If we are listening over SSL or not
   */
  ssl: boolean;
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
  /*
   * The name of the server (works like a domain)
   */
  serverName: string | undefined;
  /*
   * Used only for modules extra options
   * Ideally should be uesd as an internal key within
   * like "db.options.hybrid.url" to avoid conflicts between modules using the same keys
   */
  modules: {
    [module: string]: any;
  };
}

export type GenericObject = { [key: string]: any };

export type AllowedFunctionArguments<A = GenericObject> = A;

export type AllowedFunctionReturn<R = unknown> = R;

export type FunctionCodes = "OK" | "ERR" | "NOT_FOUND";

export type ServerFunction<R, A = GenericObject> = (
  args: AllowedFunctionArguments<A>
) => Promise<AllowedFunctionReturn<R>>;

export interface FunctionReturnBase {
  code: FunctionCodes;
}
export interface FunctionReturnOk<R> extends FunctionReturnBase {
  return: AllowedFunctionReturn<R>;
  code: "OK";
}

export interface FunctionReturnErr extends FunctionReturnBase {
  return: string;
  code: "ERR";
}

export interface FunctionReturnNotFound extends FunctionReturnBase {
  return: string;
  code: "NOT_FOUND";
}

export type FunctionReturn<R> =
  | FunctionReturnOk<R>
  | FunctionReturnErr
  | FunctionReturnNotFound;
