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

  public sendToAll(msg: ToolDbMessage, crossServerOnly = false) {
    //
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    //
  }
}

export interface ToolDbStore {
  start: () => void;
  put: (
    key: string,
    data: any,
    callback: (err: any | null, data?: any) => void
  ) => void;
  get: (key: string, callback: (err: any | null, data?: any) => void) => void;
  query: (key: string) => Promise<string[]>;
}

export type ToolDbStorageAdapter = (dbName?: string) => ToolDbStore;

export interface ToolDbOptions {
  db: string;
  debug: boolean;
  peers: string[];
  maxRetries: number;
  triggerDebouce: number;
  wait: number;
  pow: number;
  server: boolean;
  httpServer: HTTPServer | HTTPSServer | undefined;
  port: number;
  networkAdapter: typeof ToolDbNetworkAdapter;
  storageAdapter: ToolDbStorageAdapter;
  id: string;
}
