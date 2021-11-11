import WebSocket from "ws";
import { getIpFromUrl, PingMessage, textRandom, ToolDbMessage } from ".";
import ToolDb from "./tooldb";
import { ToolDbOptions } from "./types/tooldb";

export type ToolDbWebSocket = WebSocket & { toolDbId?: string };

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
      peer: ToolDbWebSocket;
    }
  > = {};

  get allPeers(): string[] {
    return Object.keys(this._connections).map(getIpFromUrl);
  }

  private _activePeers: string[] = [];

  get activePeers() {
    return this._activePeers;
  }

  public _clientSockets: Record<string, ToolDbWebSocket> = {};

  get clientSockets() {
    return this._clientSockets;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
    this.options = db.options;

    this.options.peers.forEach((url) => {
      const newSocket = this.open(url);
      if (newSocket) {
        this._connections[url] = { tries: 0, peer: newSocket, defer: null };
      }
    });

    if (this.options.server) {
      this.server = new WebSocket.Server({
        port: this.options.port,
        server: this.options.httpServer,
      });

      this.server.on("connection", (socket: ToolDbWebSocket) => {
        // console.log("new connection:", peerId);

        socket.on("close", () => {
          // console.log("closed connection:", peerId);
          if (socket.toolDbId) {
            delete this._clientSockets[socket.toolDbId];
          }
        });

        socket.on("error", () => {
          // console.log("errored connection:", peerId);
          if (socket.toolDbId) {
            delete this._clientSockets[socket.toolDbId];
          }
        });

        socket.on("message", (message: string) => {
          this.tooldb.clientOnMessage(message, socket);
        });
      });
    }
  }

  public connectTo(url: string) {
    this.open(url);
  }

  /**
   * Open a connection to a federated server
   * @param url URL of the server (including port)
   * @returns websocket
   */
  public open = (url: string): ToolDbWebSocket | undefined => {
    try {
      const wsUrl = url.replace(/^http/, "ws");
      const wss = new this._wss(wsUrl);
      if (!this._connections[url]) {
        this._connections[url] = { tries: 0, peer: wss, defer: null };
      }

      wss.onclose = (_error: any) => {
        if (this._activePeers.includes(url)) {
          this._activePeers.splice(this._activePeers.indexOf(url), 1);
        }
        if (this.options.debug) {
          console.log(_error);
        }
        this.reconnect(url);
      };

      wss.onerror = (_error: any) => {
        if (this._activePeers.includes(url)) {
          this._activePeers.splice(this._activePeers.indexOf(url), 1);
        }
        if (this.options.debug) {
          console.log(_error);
        }
        if (_error?.error?.code !== "ETIMEDOUT") {
          this.reconnect(url);
        }
      };

      wss.onopen = () => {
        if (!this._activePeers.includes(url)) {
          this._activePeers.push(url);
        }
        console.warn("Connected to " + url + " sucessfully.");

        this._connections[url].peer = wss;

        // hi peer
        wss.send(
          JSON.stringify({
            type: "ping",
            id: this.options.id,
          } as PingMessage)
        );
      };

      wss.onmessage = (msg: WebSocket.MessageEvent) => {
        if (!msg) {
          return;
        }
        this.tooldb.clientOnMessage(msg.data.toString(), wss);
      };

      return wss;
    } catch (e) {
      console.warn(e);
    }
    return undefined;
  };

  public send(msg: ToolDbMessage, filterUrls: string[] = []) {
    const filteredConns = Object.keys(this._connections)
      .filter((url) => !filterUrls.includes(getIpFromUrl(url)))
      .map((url) => this._connections[url])
      .filter((conn) => conn.peer && conn.peer.readyState === conn.peer.OPEN);

    // console.log(
    //   "Send to ",
    //   filteredConns.map((c) => c.peer.url),
    //   "but not to",
    //   filterUrls
    // );

    filteredConns.forEach((conn) => {
      conn.peer.send(JSON.stringify(msg));
    });
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    const socket = this._clientSockets[clientId];
    if (socket) {
      socket.send(JSON.stringify(msg));
    }
  }

  private reconnect = (url: string) => {
    const peer = this._connections[url];
    if (peer) {
      if (peer.defer) {
        clearTimeout(peer.defer);
      }

      if (peer.tries < this.options.maxRetries) {
        const defer = () => {
          peer.tries += 1;
          console.warn("Connection to " + url + " retry.");
          this.open(url);
        };

        peer.defer = setTimeout(defer, this.options.wait) as any;
      } else {
        console.warn("Connection attempts to " + url + " exceeded.");
        if (this._activePeers.includes(url)) {
          this._activePeers.splice(this._activePeers.indexOf(url), 1);
        }
        delete this._connections[url];

        // There are no more peers to connect!
        if (Object.keys(this._connections).length === 0) {
          this._tooldb.onDisconnect();
        }
      }
    } else {
      // no peer at url?
    }
  };

  get tooldb() {
    return this._tooldb;
  }
}
