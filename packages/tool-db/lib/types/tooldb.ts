import type ToolDbStorageAdapter from "../adapters-base/storageAdapter";
import type ToolDbUserAdapter from "../adapters-base/userAdapter";
import type { WebSocketConstructor } from "../nostr/pool";

export interface ToolDbOptions {
  /**
   * Show debug console logs
   */
  debug: boolean;
  /**
   * Nostr relays to connect to
   */
  relays: string[];
  /**
   * The namespace/topic of our app (default is "tool-db-default").
   * Apps sharing relays only see the keys of their own topic.
   */
  topic: string;
  /**
   * How long to wait (max) for a debounced key listener recv
   */
  triggerDebouce: number;
  /**
   * Our storage namespace (default is "tooldb")
   */
  storageName: string;
  /**
   * A custom storage adapter class
   */
  storageAdapter: typeof ToolDbStorageAdapter;
  /**
   * The signer of our identity (a local Nostr key by default)
   */
  userAdapter: typeof ToolDbUserAdapter;
  /**
   * WebSocket implementation, defaults to the global one (browsers, Node 22+)
   */
  WebSocket: WebSocketConstructor | undefined;
}

export type GenericObject = { [key: string]: any };

export type AllowedFunctionArguments<A = GenericObject> = A;

export type AllowedFunctionReturn<R = unknown> = R;

export type FunctionCodes = "OK" | "ERR" | "NOT_FOUND";

export type ServerFunction<R, A = GenericObject> = (
  args: AllowedFunctionArguments<A>,
  caller: string
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
