import _ from "lodash";
import Libp2p from "libp2p";
import Websockets from "libp2p-websockets";
import WebRTCStar from "libp2p-webrtc-star";
import { NOISE } from "@chainsafe/libp2p-noise";
import Mplex from "libp2p-mplex";

import { MuxedStream } from "libp2p-interfaces/dist/src/stream-muxer/types";

import pipe from "it-pipe";

import { PingMessage, textRandom, ToolDb, ToolDbMessage } from ".";

import { ToolDbOptions } from "./types/tooldb";

export const PROTOCOL_VER = `/tooldb/1.2.0`;

export default class toolDbLibP2p {
  private options: ToolDbOptions;

  private _tooldb: ToolDb;

  private _libp2p: Libp2p | undefined;

  public _clientSockets: Record<string, MuxedStream> = {};

  get clientSockets() {
    return this._clientSockets;
  }

  get libp2p() {
    return this._libp2p;
  }

  private async createLibP2p() {
    const options = {
      addresses: {
        listen: [
          "/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
          "/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
        ],
      },
      modules: {
        transport: [Websockets, WebRTCStar],
        connEncryption: [NOISE],
        streamMuxer: [Mplex],
      },
    };

    const node = await Libp2p.create(options);
    this._libp2p = node;
    (window as any).libp2p = node;
    this._tooldb.options.id = node.peerId.toB58String();

    // Listen for new peers
    // node.on("peer:discovery", (peerId) => {
    //   console.log(`Found peer ${peerId.toB58String()}`);
    // });

    // Listen for new connections to peers
    node.connectionManager.on("peer:connect", (connection: any) => {
      // Send message to other peers (connected) using the protocol
      node.peerStore.peers.forEach(async (peer: any) => {
        const connection = node.connectionManager.get(peer.id);
        if (!connection) return;
        if (!peer.protocols.includes(PROTOCOL_VER)) {
          // Close connections without our protocol
          connection.close();
          return;
        }
        const pid = peer.id.toB58String();

        if (!this.clientSockets[pid]) {
          console.warn(`Protocol found ${PROTOCOL_VER}`);
          try {
            const { stream } = await connection.newStream([PROTOCOL_VER]);
            this.clientSockets[pid] = stream;
            await this.sendToClientId(pid, {
              type: "ping",
              clientId: this.options.id,
              to: [this.options.id],
              isServer: this.options.server,
              id: textRandom(10),
            } as PingMessage);
          } catch (err) {
            console.info("Could not handshake protocol with peer", err);
          }
        }
      });
    });

    // Listen for peers disconnecting
    node.connectionManager.on("peer:disconnect", (connection: any) => {
      const pid = connection.remotePeer.toB58String();
      delete this.clientSockets[pid];
    });

    node.handle(PROTOCOL_VER, (args: any) => this.toolDbProtocolHandler(args));
    await node.start();
    return node;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
    this.options = db.options;

    this.createLibP2p();
    if (this.options.server) {
      //
    }
  }

  public close(clientId: string): void {
    if (this.libp2p) {
      const conn = this.libp2p.connections.get(clientId);
      if (conn && conn[0]) {
        conn[0].close();
      }
    }
  }

  /**
   * A simple handler to print incoming messages to the console
   * @param {Object} params
   * @param {Connection} params.connection The connection the stream belongs to
   * @param {Stream} params.stream stream to the peer
   */
  public async toolDbProtocolHandler({
    connection,
    stream,
  }: {
    connection: any;
    stream: any[];
  }) {
    try {
      await pipe(stream, async (source) => {
        for await (const message of source) {
          console.info(`${connection.remotePeer.toB58String()}: ${message}`);
          this._tooldb.clientOnMessage(
            `${message}`,
            connection.remotePeer.toB58String()
          );
        }
      });
      // Replies are done on new streams, so let's close this stream so we don't leak it
      await pipe([], stream);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Writes a given `message` over the given `stream`.
   * @param {String} message The message to send over `stream`
   * @param {Stream} stream A stream over the muxed Connection to our peer
   */
  public async toolDbProtocolSend(message: string, stream: MuxedStream) {
    try {
      await pipe([message], stream, async function (source: any) {
        for await (const message of source) {
          console.info(`Me: ${message}`);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  public sendToAll(msg: ToolDbMessage, crossServerOnly = false) {
    const to = _.uniq([...msg.to, this.options.id]);

    const filteredConns = Object.keys(this.clientSockets).filter(
      (id) => !to.includes(id)
    );

    filteredConns.forEach((clientId) => {
      const stream = this._clientSockets[clientId];
      if (!crossServerOnly) {
        console.log("Sent out to: ", clientId);
        if (stream) {
          const message = JSON.stringify({ ...msg, to });
          this.toolDbProtocolSend(message, stream);
        }
      }
    });
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    const stream = this._clientSockets[clientId];
    if (stream) {
      const to = _.uniq([...msg.to, this.options.id]);
      const message = JSON.stringify({ ...msg, to });
      this.toolDbProtocolSend(message, stream);
    }
  }

  get tooldb() {
    return this._tooldb;
  }
}
