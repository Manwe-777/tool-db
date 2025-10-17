import WebSocket from "ws";

import { ToolDb, textRandom, ToolDbNetworkAdapter } from "tool-db";

interface ConnectionAwaiting {
  socket: WebSocket;
  tries: number;
  defer: null | number;
  host: string;
  port: number;
  id: string;
}

export default class ToolDbWebsocket extends ToolDbNetworkAdapter {
  private wnd =
    typeof window === "undefined" ? undefined : (window as any | undefined);

  private _wss = this.wnd
    ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
    : WebSocket;

  public server: WebSocket.Server | null = null;

  private _connections: Record<
    string,
    {
      tries: number;
      defer: number | null;
      peer: WebSocket;
    }
  > = {};

  private _awaitingConnections: ConnectionAwaiting[] = [];

  private removeFromAwaiting = (id: string) => {
    const index = this._awaitingConnections.findIndex((c) => c.id === id);
    if (index !== -1) {
      this._awaitingConnections.splice(index, 1);
    }
  };

  constructor(db: ToolDb) {
    super(db);

    this.tooldb.options.peers.forEach((p) => {
      this.connectTo(p.host, p.port);
    });

    if (this.tooldb.options.server) {
      this.server = new WebSocket.Server({
        port: this.tooldb.options.port,
        server: this.tooldb.options.httpServer,
      });

      this.server.on("connection", (socket: WebSocket) => {
        let clientId: string | null = null;

        this.tooldb.logger("new connection");
        socket.on("close", () => {
          this.tooldb.logger("closed connection:", clientId);
          if (clientId) {
            this.onClientDisconnect(clientId);
          }
        });

        socket.on("error", () => {
          this.tooldb.logger("errored connection:", clientId);
          if (clientId) {
            this.onClientDisconnect(clientId);
          }
        });

        socket.on("message", (message: string) => {
          this.onClientMessage(message, clientId || "", (id) => {
            clientId = id;

            // Set this socket's functions on the adapter
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
  public connectTo = (
    host: string,
    port: number,
    connectionId?: string
  ): WebSocket | undefined => {
    this.tooldb.logger("connectTo:", host + ":" + port);
    try {
      const wsUrl =
        port === 443 ? "wss://" + host : "ws://" + host + ":" + port;
      const wss = new this._wss(wsUrl);
      const connId = connectionId || textRandom(10);
      let clientId = "";

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
        this.tooldb.logger(_error.error);
        this.reconnect(connId);
      };

      wss.onerror = (_error: any) => {
        this.tooldb.logger("wss.onerror", connId);
        if (_error?.error?.code !== "ETIMEDOUT") {
          this.reconnect(connId);
        }
      };

      wss.onopen = () => {
        this.removeFromAwaiting(connId);
        this.tooldb.logger(`Connected to ${host}:${port} sucessfully.`);

        // hi peer
        this.craftPingMessage().then((msg) => {
          wss.send(msg);
        });
      };

      wss.onmessage = (msg: WebSocket.MessageEvent) => {
        if (!msg) {
          return;
        }

        this.onClientMessage(msg.data as string, clientId, (id) => {
          clientId = id;

          this.isClientConnected[id] = () => {
            return wss.readyState === wss.OPEN;
          };
          this.clientToSend[id] = (_msg: string) => {
            wss.send(_msg);
          };
        });
      };

      return wss;
    } catch (e) {
      this.tooldb.logger(e);
    }
    return undefined;
  };

  private reconnect = (connectionId: string) => {
    const connection = this._awaitingConnections.filter(
      (c) => c.id === connectionId
    )[0];
    this.tooldb.logger("reconnect", connectionId, connection);
    if (connection) {
      if (connection.defer) {
        clearTimeout(connection.defer);
      }

      this.tooldb.logger(
        `connection ${connectionId} tries: ${connection.tries}`
      );
      if (connection.tries < this.tooldb.options.maxRetries) {
        const defer = () => {
          connection.tries += 1;
          this.tooldb.logger(
            `connection to ${connection.host}:${connection.port} (${connectionId}) retry.`
          );
          this.connectTo(connection.host, connection.port, connectionId);
        };

        connection.defer = setTimeout(defer, this.tooldb.options.wait) as any;
      } else {
        this.tooldb.logger(
          `connection attempts to ${connection.host}:${connection.port} (${connectionId}) exceeded,`
        );
        this.removeFromAwaiting(connectionId);

        // There are no more peers to connect!
        if (Object.keys(this._connections).length === 0) {
          this.tooldb.onDisconnect();
          this.tooldb.isConnected = false;
        }
      }
    }
    // else , attempting to reconnect to a missing peer?
  };
}
