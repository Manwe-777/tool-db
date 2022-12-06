import WebSocket from "ws";

import {
  ToolDb,
  sha1,
  textRandom,
  ToolDbNetworkAdapter,
  sha256,
  ToolDbMessage,
} from "tool-db";

type SocketMessageFn = (socket: WebSocket, e: { data: any }) => void;

interface ServerPeerData {
  host: string;
  port: number;
  ssl: boolean;
  name: string;
  pubKey: string;
  signature: string;
}

interface ConnectionAwaiting {
  socket: WebSocket;
  tries: number;
  defer: null | number;
  server: ServerPeerData;
}

const announceSecs = 30;
const maxAnnounceSecs = 99999999;

const defaultTrackerUrls = [
  "wss://tooldb-tracker.herokuapp.com/",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.webtorrent.io",
  "wss://tracker.files.fm:7073/announce",
  "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
];

export default class ToolDbHybrid extends ToolDbNetworkAdapter {
  private wnd =
    typeof window === "undefined" ? undefined : (window as any | undefined);

  private wss = this.wnd
    ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
    : WebSocket;

  private sockets: Record<string, WebSocket | null> = {};

  private socketListeners: Record<string, SocketMessageFn> = {};

  private connectedServers: Record<string, WebSocket> = {};

  private serversFinding: string[] = [];

  public announceInterval: any;

  private trackerUrls = defaultTrackerUrls; // .slice(0, 2);

  private handledOffers: Record<string, boolean> = {};

  private _awaitingConnections: ConnectionAwaiting[] = [];

  // We need to create a queue to handle a situation when we need
  // to contact a server, but we havent connected to it yet.
  private _messageQueue: ToolDbMessage[] = [];

  get messageQueue() {
    return this._messageQueue;
  }

  public pushToMessageQueue(msg: ToolDbMessage) {
    this._messageQueue.push(msg);
  }

  private removeFromAwaiting = (pubkey: string) => {
    const index = this._awaitingConnections.findIndex(
      (c) => c.server.pubKey === pubkey
    );
    if (index !== -1) {
      this._awaitingConnections.slice(index, 1);
    }
  };

  /**
   * Makes a websocket connection to a tracker
   */
  private makeSocket = (url: string) => {
    return new Promise<WebSocket | null>((resolve) => {
      if (!this.sockets[url]) {
        this.tooldb.logger("begin tracker connection " + url);

        this.socketListeners[url] = this.onSocketMessage;

        try {
          const socket = new this.wss(url);
          // eslint-disable-next-line func-names
          const socks = this.sockets;
          socket.onopen = function () {
            socks[url] = this;
            resolve(this);
          };
          socket.onmessage = (e: any) => this.socketListeners[url](socket, e);

          // eslint-disable-next-line func-names
          socket.onerror = () => {
            const index = this.trackerUrls.indexOf(url);
            this.trackerUrls.splice(index, 1);
            resolve(null);
          };
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(this.sockets[url]);
      }
    });
  };

  /**
   * Announce ourselves to a tracker (send "announce")
   */
  private announce = async (socket: WebSocket, infoHash: string) => {
    this.tooldb.peerAccount
      .signData(this.tooldb.options.host)
      .then((signature) => {
        if (this.tooldb.options.server) {
          const offer = JSON.stringify({
            host: this.tooldb.options.host,
            port: this.tooldb.options.port,
            ssl: this.tooldb.options.ssl,
            name: this.tooldb.options.serverName,
            pubKey: this.tooldb.peerAccount.getAddress(),
            signature,
          } as ServerPeerData);

          socket.send(
            JSON.stringify({
              action: "announce",
              info_hash: infoHash,
              peer_id: this.getClientAddress(),
              numwant: 1,
              offers: [
                {
                  offer: { sdp: offer, type: "offer" },
                  offer_id: textRandom(20),
                },
              ],
            })
          );
        } else {
          socket.send(
            JSON.stringify({
              action: "announce",
              info_hash: infoHash,
              peer_id: this.getClientAddress(),
              numwant: 1,
            })
          );
        }
      });
  };

  /**
   * Announce ourselves to all trackers as a server
   */
  private announceAll = async () => {
    const infoHash = sha256(this.tooldb.options.serverName || "").slice(-20);
    this.tooldb.logger(
      `announce: "${this.tooldb.options.serverName}" (${infoHash})`
    );

    this.trackerUrls.forEach(async (url: string) => {
      const socket = await this.makeSocket(url);
      //this.tooldb.logger(" ok tracker " + url);
      // this.tooldb.logger("socket", url, socket);
      if (socket && socket.readyState === 1) {
        //this.tooldb.logger("announce to " + url);
        this.announce(socket, infoHash);
      }
    });
  };

  /**
   * Announce on trackers for a server
   * Connects to it if found
   */
  public findServer = async (serverName: string) => {
    if (!this.serversFinding.includes(serverName)) {
      this.serversFinding.push(serverName);
      const infoHash = sha256(serverName).slice(-20);

      this.trackerUrls.forEach(async (url: string) => {
        const socket = await this.makeSocket(url);
        if (socket && socket.readyState === 1) {
          this.announce(socket, infoHash);
        }
      });
    }
  };

  /**
   * Handle the tracker messages
   */
  private onSocketMessage: SocketMessageFn = async (
    socket: WebSocket,
    e: any
  ) => {
    let val: {
      info_hash: string;
      peer_id: string;
      "failure reason"?: string;
      interval?: number;
      offer?: {
        sdp: string;
        type: string;
      };
      offer_id: string;
      answer?: string;
    };

    try {
      val = JSON.parse(e.data);
      this.tooldb.logger("onSocketMessage", socket.url, val);
    } catch (_e: any) {
      this.tooldb.logger(`Received malformed JSON`, e.data);
      return;
    }

    const failure = val["failure reason"];

    if (failure) {
      this.tooldb.logger(`${e.origin}: torrent tracker failure (${failure})`);
      return;
    }

    if (val.peer_id && val.peer_id === this.getClientAddress()) {
      // this.tooldb.logger("Peer ids mismatch", val.peer_id, selfId);
      return;
    }

    if (val.offer && val.offer_id) {
      if (this.handledOffers[val.offer_id]) {
        return;
      }

      this.handledOffers[val.offer_id] = true;

      const serverData = JSON.parse(val.offer.sdp);

      if (this.connectedServers[serverData.name] === undefined) {
        this.tooldb.logger("Now we connect to ", serverData);
        this.connectTo(serverData);
      } else {
        // we alreayd connected, unplug all trackers/unsubscribe
      }

      return;
    }
  };

  constructor(db: ToolDb) {
    super(db);

    const _this = this;
    setTimeout(function () {
      if (_this.tooldb.options.server) {
        _this.announceInterval = setInterval(
          _this.announceAll,
          announceSecs * 1000
        );
        _this.announceAll();
      }
    }, 500);

    // Basically the same as the WS network adapter
    // Only for Node!
    if (this.tooldb.options.server && typeof window === "undefined") {
      const server = new WebSocket.Server({
        port: this.tooldb.options.port,
        server: this.tooldb.options.httpServer,
      });

      server.on("connection", (socket: WebSocket) => {
        let clientId: string | null = null;

        socket.on("close", () => {
          if (clientId) {
            this.onClientDisconnect(clientId);
          }
        });

        socket.on("error", () => {
          if (clientId) {
            this.onClientDisconnect(clientId);
          }
        });

        socket.on("message", (message: string) => {
          this.onClientMessage(message, clientId || "", (id) => {
            clientId = id;
            this.isClientConnected[id] = () => {
              return socket.readyState === socket.OPEN;
            };
            this.clientToSend[id] = (_msg: string) => {
              socket.send(_msg);
            };
          });
        });
      });
    }
  }

  /**
   * Open a connection to a server
   * @param url URL of the server (including port)
   * @returns websocket
   */
  public connectTo = (serverPeer: ServerPeerData): WebSocket | undefined => {
    this.tooldb.logger("connectTo:", serverPeer);
    try {
      const wsUrl = serverPeer.ssl
        ? "wss://" + serverPeer.host
        : "ws://" + serverPeer.host + ":" + serverPeer.port;

      const wss = new this.wss(wsUrl);
      let clientId = serverPeer.pubKey;

      // Unlike other network adapters, we can just use the server name
      // to identify connections.
      // Therefore, we dont have to wait for a pong message to
      // initialize these internal functions
      this.isClientConnected[serverPeer.name] = () => {
        return wss.readyState === wss.OPEN;
      };

      this.clientToSend[serverPeer.name] = (_msg: string) => {
        wss.send(_msg);
      };

      const previousConnection = this._awaitingConnections.filter(
        (c) => c.server.pubKey === serverPeer.pubKey
      )[0];

      if (serverPeer.pubKey && previousConnection) {
        previousConnection.socket = wss;
      } else {
        this._awaitingConnections.push({
          socket: wss,
          tries: 0,
          defer: null,
          server: { ...serverPeer },
        });
      }

      wss.onclose = (_error: any) => {
        this.tooldb.logger(_error.error);
        this.reconnect(serverPeer.pubKey);
      };

      wss.onerror = (_error: any) => {
        this.tooldb.logger("wss.onerror", serverPeer.pubKey);
        if (_error?.error?.code !== "ETIMEDOUT") {
          this.reconnect(serverPeer.pubKey);
        }
      };

      wss.onopen = () => {
        this.removeFromAwaiting(serverPeer.pubKey);
        this.tooldb.logger(
          `Connected to ${serverPeer.host}:${serverPeer.port} sucessfully.`
        );

        // hi peer
        this.craftPingMessage().then((msg) => {
          wss.send(msg);
        });

        this.connectedServers[serverPeer.name] = wss;
      };

      wss.onmessage = (msg: WebSocket.MessageEvent) => {
        if (!msg) {
          return;
        }

        this.onClientMessage(msg.data as string, clientId, (id) => {
          clientId = id;
        });
      };

      return wss;
    } catch (e) {
      this.tooldb.logger(e);
    }
    return undefined;
  };

  private reconnect = (pubkey: string) => {
    const connection = this._awaitingConnections.filter(
      (c) => c.server.pubKey === pubkey
    )[0];
    this.tooldb.logger("reconnect", pubkey, connection);
    if (connection) {
      if (connection.defer) {
        clearTimeout(connection.defer);
      }

      this.tooldb.logger(`connection ${pubkey} tries: ${connection.tries}`);
      if (connection.tries < this.tooldb.options.maxRetries) {
        const defer = () => {
          connection.tries += 1;
          this.tooldb.logger(
            `connection to ${connection.server.host}:${connection.server.port} (${pubkey}) retry.`
          );
          this.connectTo(connection.server);
        };

        connection.defer = setTimeout(defer, this.tooldb.options.wait) as any;
      } else {
        this.tooldb.logger(
          `connection attempts to ${connection.server.host}:${connection.server.port} (${pubkey}) exceeded,`
        );
        this.removeFromAwaiting(pubkey);
      }
    }
    // else , attempting to reconnect to a missing peer?
  };

  public close(clientId: string): void {
    //
  }

  public sendToAll(msg: ToolDbMessage, crossServerOnly = false) {
    this.pushToMessageQueue({ ...msg });
    this.tryExecuteMessageQueue();
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage): void {
    this.pushToMessageQueue({ ...msg, to: [clientId] });
    this.tryExecuteMessageQueue();
  }

  private tryExecuteMessageQueue() {
    const sentMessageIDs: string[] = [];
    this._messageQueue.forEach((message) => {
      const clientId = message.to[0];
      if (
        this.isClientConnected[clientId] &&
        this.isClientConnected[clientId]()
      ) {
        this.clientToSend[clientId](JSON.stringify(message));
        sentMessageIDs.push(message.id);
      }

      if (this.connectedServers[clientId] === undefined) {
        this.findServer(clientId);
      }
    });

    sentMessageIDs.forEach((id) => {
      const index = this._messageQueue.findIndex((msg) => msg.id === id);
      this._messageQueue.splice(index, 1);
    });

    if (this._messageQueue.length > 0) {
      setTimeout(() => {
        this.tryExecuteMessageQueue();
      }, 250);
    }
  }
}
