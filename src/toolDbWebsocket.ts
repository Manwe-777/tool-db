import _ from "lodash";
import WebSocket from "ws";
import { PingMessage, textRandom, ToolDbMessage } from ".";
import ToolDb from "./tooldb";
import ToolDbNetworkAdapter from "./toolDbNetworkAdapter";

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

  private server: WebSocket.Server | null = null;

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
      this._awaitingConnections.slice(index, 1);
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

        // console.log("new connection:", clientId);
        socket.on("close", () => {
          // console.log("closed connection:", clientId);
          if (clientId) {
            this.onClientDisconnect(clientId);
          }
        });

        socket.on("error", () => {
          // console.log("errored connection:", clientId);
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
    try {
      const wsUrl =
        port === 443 ? "wss://" + host : "ws://" + host + ":" + port;
      const wss = new this._wss(wsUrl);
      const connId = textRandom(10);
      let clientId = "";
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
        if (this.tooldb.options.debug) {
          console.log(_error.error);
        }
        this.reconnect(connId);
      };

      wss.onerror = (_error: any) => {
        if (this.tooldb.options.debug) {
          console.log(_error.error);
        }
        if (_error?.error?.code !== "ETIMEDOUT") {
          this.reconnect(connId);
        }
      };

      wss.onopen = () => {
        this.removeFromAwaiting(connId);
        if (this.tooldb.options.debug) {
          console.warn("Connected to " + host + ": " + port + " sucessfully.");
        }

        // hi peer
        wss.send(
          JSON.stringify({
            type: "ping",
            clientId: this.tooldb.network.getClientAddress(),
            to: [this.tooldb.network.getClientAddress()],
            isServer: this.tooldb.options.server,
            id: textRandom(10),
          } as PingMessage)
        );
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
      console.warn(e);
    }
    return undefined;
  };

  private reconnect = (connectionId: string) => {
    const connection = this._awaitingConnections.filter(
      (c) => c.id === connectionId
    )[0];
    if (connection) {
      if (connection.defer) {
        clearTimeout(connection.defer);
      }

      if (connection.tries < this.tooldb.options.maxRetries) {
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

        connection.defer = setTimeout(defer, this.tooldb.options.wait) as any;
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
          this.tooldb.onDisconnect();
          this.tooldb.isConnected = false;
        }
      }
    }
    // else , attempting to reconnect to a missing peer?
  };
}
