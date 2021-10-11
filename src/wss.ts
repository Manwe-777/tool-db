import WebSocket from "ws";
import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";
import { ToolDbOptions } from "./types/tooldb";

export default class WSS {
  // eslint-disable-next-line no-undef
  private wnd =
    typeof window === "undefined" ? undefined : (window as any | undefined);

  private _wss = this.wnd
    ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
    : WebSocket;

  private options: ToolDbOptions;

  private server: WebSocket.Server | null = null;

  private _tooldb: ToolDb;

  private _connections: Record<
    string,
    {
      tries: number;
      defer: number | null;
      peer: any;
    }
  > = {};

  private _activePeers: string[] = [];

  get activePeers() {
    return this._activePeers;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
    this.options = db.options;

    this.options.peers.forEach((url) => {
      const conn = this.open(url);
      this._connections[url] = { tries: 0, peer: conn, defer: null };
    });

    if (this.options.server) {
      this.server = new WebSocket.Server({ port: this.options.port });

      this.server.on("connection", (socket) => {
        socket.on("message", (message: ToolDbMessage) => {
          this.tooldb.clientOnMessage(message, socket);
        });
      });
    }
  }

  /**
   * Open a connection to a federated server
   * @param url URL of the server (including port)
   * @returns websocket
   */
  public open = (url: string): any | undefined => {
    try {
      const wsUrl = url.replace(/^http/, "ws");
      const wss = new this._wss(wsUrl);

      wss.onclose = (e: any) => {
        if (this._activePeers.includes(url)) {
          this._activePeers.splice(this._activePeers.indexOf(url), 1);
        }
        this.reconnect(url);
      };

      wss.onerror = (_error: any) => {
        if (this._activePeers.includes(url)) {
          this._activePeers.splice(this._activePeers.indexOf(url), 1);
        }
        this.reconnect(url);
      };

      wss.onopen = () => {
        if (!this._activePeers.includes(url)) {
          this._activePeers.push(url);
        }
        this._connections[url].tries = 0;
        // hi peer
      };

      wss.onmessage = (msg: ToolDbMessage) => {
        if (!msg) {
          return;
        }
        this.tooldb.clientOnMessage(msg, wss);
      };

      return wss;
    } catch (e) {
      console.warn(e);
    }
    return undefined;
  };

  public send(msg: ToolDbMessage) {
    Object.values(this._connections).forEach((conn) => {
      if (conn.peer) {
        conn.peer.send(JSON.stringify(msg));
      }
    });
  }

  private reconnect = (url: string) => {
    const peer = this._connections[url];
    if (peer.defer) {
      clearTimeout(peer.defer);
    }

    if (peer.tries < this.options.maxRetries) {
      const defer = () => {
        peer.tries += 1;
        console.log("Retry");
        this.open(url);
      };

      peer.defer = setTimeout(defer, this.options.wait) as any;
    } else {
      console.warn("Connection attempts to " + url + " exceeded.");
    }
  };

  get tooldb() {
    return this._tooldb;
  }
}
