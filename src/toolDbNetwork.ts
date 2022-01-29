import _ from "lodash";
import WebSocket from "ws";
import { PingMessage, textRandom, ToolDbMessage } from ".";
import ToolDb from "./tooldb";
import { ToolDbOptions } from "./types/tooldb";

export type ToolDbWebSocket = WebSocket & {
  toolDbId?: string;
  isServer: boolean;
  origUrl: string;
};

interface ConnectionAwaiting {
  socket: WebSocket;
  tries: number;
  defer: null | number;
  host: string;
  port: number;
  id: string;
}

export default class toolDbNetwork {
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

  private _awaitingConnections: ConnectionAwaiting[] = [];

  private removeFromAwaiting = (id: string) => {
    const index = this._awaitingConnections.findIndex((c) => c.id === id);
    if (index !== -1) {
      this._awaitingConnections.slice(index, 1);
    }
  };

  public _clientSockets: Record<string, ToolDbWebSocket> = {};

  get clientSockets() {
    return this._clientSockets;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
    this.options = db.options;

    this.options.peers.forEach((p) => {
      this.connectTo(p.host, p.port);
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
          try {
            const parsedMessage = JSON.parse(message) as ToolDbMessage;
            if (parsedMessage.type === "ping") {
              socket.toolDbId = parsedMessage.clientId;
              socket.isServer = parsedMessage.isServer;
              this._clientSockets[parsedMessage.clientId] = socket;
              this.tooldb.processedOutHashes[parsedMessage.clientId] = [];
            }
            if (parsedMessage.type === "pong") {
              socket.toolDbId = parsedMessage.clientId;
              socket.isServer = parsedMessage.isServer;
              this._clientSockets[parsedMessage.clientId] = socket;
              this.tooldb.processedOutHashes[parsedMessage.clientId] = [];
            }

            this.tooldb.clientOnMessage(parsedMessage, socket.toolDbId || "");
          } catch (e) {
            console.log("Got message ERR > ", message);
            console.log(e);
          }
        });
      });
    }
  }

  /**
   * Open a connection to a federated server
   * @param url URL of the server (including port)
   * @returns websocket
   */
  public connectTo = (
    host: string,
    port: number,
    connectionId?: string
  ): ToolDbWebSocket | undefined => {
    try {
      const wsUrl =
        port === 443 ? "wss://" + host : "ws://" + host + ":" + port;
      const wss = new this._wss(wsUrl);
      const connId = textRandom(10);
      wss.connId = connectionId || connId;

      const previousConnection = this._awaitingConnections.filter(
        (c) => c.id === connectionId
      )[0];
      if (connectionId && previousConnection) {
        previousConnection.socket = wss;
      } else {
        this._awaitingConnections.push({
          id: connId,
          socket: wss,
          tries: 0,
          defer: null,
          host: host,
          port: port,
        });
      }

      wss.onclose = (_error: any) => {
        if (this.options.debug) {
          console.log(_error.error);
        }

        this.reconnect(connId);
      };

      wss.onerror = (_error: any) => {
        if (this.options.debug) {
          console.log(_error.error);
        }
        if (_error?.error?.code !== "ETIMEDOUT") {
          this.reconnect(connId);
        }
      };

      wss.onopen = () => {
        this.removeFromAwaiting(connId);
        if (this.options.debug) {
          console.warn("Connected to " + host + ": " + port + " sucessfully.");
        }

        // hi peer
        wss.send(
          JSON.stringify({
            type: "ping",
            clientId: this.options.id,
            to: [this.options.id],
            isServer: this.options.server,
            id: textRandom(10),
          } as PingMessage)
        );
      };

      wss.onmessage = (msg: WebSocket.MessageEvent) => {
        if (!msg) {
          return;
        }

        try {
          const parsedMessage = JSON.parse(msg.data as string) as ToolDbMessage;
          if (parsedMessage.type === "ping") {
            wss.toolDbId = parsedMessage.clientId;
            wss.isServer = parsedMessage.isServer;
            this._clientSockets[parsedMessage.clientId] = wss;
            this.tooldb.processedOutHashes[parsedMessage.clientId] = [];
          }
          if (parsedMessage.type === "pong") {
            wss.toolDbId = parsedMessage.clientId;
            wss.isServer = parsedMessage.isServer;
            this._clientSockets[parsedMessage.clientId] = wss;
            this.tooldb.processedOutHashes[parsedMessage.clientId] = [];
          }

          this.tooldb.clientOnMessage(parsedMessage, wss.toolDbId);
        } catch (e) {
          console.log("Got message ERR > ", msg);
          console.log(e);
        }
      };

      return wss;
    } catch (e) {
      console.warn(e);
    }
    return undefined;
  };

  public close(clientId: string): void {
    const sock = this._clientSockets[clientId];
    if (sock) {
      if (sock.origUrl) {
        const peer = this._connections[sock.origUrl];
        peer.tries = this.options.maxRetries;
      }
      sock.close();
      delete this._clientSockets[clientId];
    }
  }

  public sendToAll(
    msg: ToolDbMessage,
    crossServerOnly = false,
    isRelay = false
  ) {
    const to = isRelay
      ? _.uniq([...msg.to])
      : _.uniq([...msg.to, this.options.id]);

    const filteredConns = Object.keys(this.clientSockets)
      .filter((id) => !to.includes(id))
      .map((clientId) => this._clientSockets[clientId])
      .filter((conn) => conn && conn.readyState === conn.OPEN);

    // console.log(">> Send message: ", msg.type, "to: ", to);

    // console.log(
    //   "filteredConns ",
    //   filteredConns.map((c) => c.toolDbId)
    // );

    filteredConns.forEach((conn) => {
      if ((crossServerOnly && conn.isServer) || !crossServerOnly) {
        if (this.options.debug) {
          console.log("Sent out to: ", conn.toolDbId, conn.origUrl);
        }
        if (msg.type === "put" || msg.type === "crdtPut") {
          if (
            conn.toolDbId &&
            !this.tooldb.processedOutHashes[conn.toolDbId].includes(msg.h)
          ) {
            conn.send(JSON.stringify({ ...msg, to }));
            this.tooldb.processedOutHashes[conn.toolDbId].push(msg.h);
          }
        } else {
          conn.send(JSON.stringify({ ...msg, to }));
        }
      } else {
        // console.log("Fitlered out!", conn.toolDbId, conn.origUrl);
      }
    });
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    const socket = this._clientSockets[clientId];
    if (socket) {
      const to = _.uniq([...msg.to, this.options.id]);

      if (msg.type === "put" || msg.type === "crdtPut") {
        if (
          clientId &&
          !this.tooldb.processedOutHashes[clientId].includes(msg.h)
        ) {
          socket.send(JSON.stringify({ ...msg, to }));
          this.tooldb.processedOutHashes[clientId].push(msg.h);
        }
      } else {
        socket.send(JSON.stringify({ ...msg, to }));
      }
    }
  }

  private reconnect = (connectionId: string) => {
    const connection = this._awaitingConnections.filter(
      (c) => c.id === connectionId
    )[0];
    if (connection) {
      if (connection.defer) {
        clearTimeout(connection.defer);
      }

      if (connection.tries < this.options.maxRetries) {
        const defer = () => {
          connection.tries += 1;
          console.warn(
            "Connection to " +
              connection.host +
              ":" +
              connection.port +
              " retry."
          );
          this.connectTo(connection.host, connection.port, connectionId);
        };

        connection.defer = setTimeout(defer, this.options.wait) as any;
      } else {
        console.warn(
          "Connection attempts to " +
            connection.host +
            ":" +
            connection.port +
            " exceeded."
        );
        this.removeFromAwaiting(connectionId);

        // There are no more peers to connect!
        if (Object.keys(this._connections).length === 0) {
          this._tooldb.onDisconnect();
        }
      }
    }
    // else , attempting to reconnect to a missing peer?
  };

  get tooldb() {
    return this._tooldb;
  }
}
