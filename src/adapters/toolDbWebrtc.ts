import _ from "lodash";
import Peer from "simple-peer";

import { ToolDb, sha1, textRandom, ToolDbNetworkAdapter } from "..";

import WebSocket from "ws";

type SocketMessageFn = (socket: WebSocket, e: { data: any }) => void;

type IOffers = Record<
  string,
  {
    peer: Peer.Instance;
    offerP: Promise<Peer.Instance>;
  }
>;

const offerPoolSize = 5;
const maxPeers = 4;
const announceSecs = 30;
const maxAnnounceSecs = 86400;

const defaultTrackerUrls = [
  "wss://tooldb-tracker.herokuapp.com/",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.webtorrent.io",
  "wss://tracker.files.fm:7073/announce",
  "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
];

export default class toolDbWebrtc extends ToolDbNetworkAdapter {
  private wnd =
    typeof window === "undefined" ? undefined : (window as any | undefined);

  private wss = this.wnd
    ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
    : WebSocket;

  private sockets: Record<string, WebSocket | null> = {};

  private socketListeners: Record<string, Record<string, SocketMessageFn>> = {};

  private peerMap: Record<string, Peer.Instance> = {};

  private connectedPeers: Record<string, boolean> = {};

  private onDisconnect = (id: string, err: any) => {
    this.tooldb.logger(id, err);
    if (this.connectedPeers[id]) delete this.connectedPeers[id];
    if (this.peerMap[id]) delete this.peerMap[id];
    if (Object.keys(this.peerMap).length === 0) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }
  };

  private peersCheck() {
    Object.keys(this.clientToSend).forEach((id) => {
      if (!this.isConnected(id)) {
        this.tooldb.logger("disconnected from " + id);
        this.onClientDisconnect(id);
        const peer = this.peerMap[id];
        if (peer) {
          peer.destroy();
        }
        if (this.connectedPeers[id]) delete this.connectedPeers[id];
        delete this.peerMap[id];
      }
    });

    if (Object.keys(this.peerMap).length === 0) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }
  }

  private announceInterval;

  /**
   * Initialize webrtc peer
   */
  private initPeer = (
    initiator: boolean,
    trickle: boolean,
    rtcConfig: any // RTCConfiguration
  ) => {
    const peer: Peer.Instance = new Peer({
      wrtc: (this.tooldb.options as any).wrtc,
      initiator,
      trickle,
      config: rtcConfig,
    });
    return peer;
  };

  private handledOffers: Record<string, boolean> = {};

  private offerPool: Record<
    string,
    {
      peer: Peer.Instance;
      offerP: Promise<Peer.Instance>;
    }
  > = {};

  private trackerUrls = defaultTrackerUrls; // .slice(0, 2);

  private infoHash = "";

  /**
   * Make connection offers (sdp) to send to the tracker
   */
  private makeOffers = () => {
    const offers: IOffers = {};

    new Array(offerPoolSize).fill(0).forEach(() => {
      try {
        const peer = this.initPeer(true, false, {});
        const oid = textRandom(20);
        offers[oid] = {
          peer,
          offerP: new Promise((res) => peer.once("signal", res)),
        };
      } catch (e) {
        this.tooldb.logger(e);
      }
    });
    return offers;
  };

  /**
   * When we sucessfully connect to a webrtc peer
   */
  private onPeerConnect = (peer: Peer.Instance, id: string) => {
    if (this.peerMap[id]) {
      this.peerMap[id].end();
      this.peerMap[id].destroy();
      delete this.peerMap[id];
    }

    let clientId: string | null = null;

    // this.tooldb.logger("onPeerConnect", id);

    const onData = (data: Uint8Array) => {
      const str = new TextDecoder().decode(data);

      this.onClientMessage(str, clientId || "", (id) => {
        clientId = id;
        // Set this socket's functions on the adapter
        this.isClientConnected[id] = () => {
          return peer.connected;
        };

        this.clientToSend[id] = (_msg: string) => {
          peer.send(_msg);
        };
      });
    };

    this.peerMap[id] = peer;

    peer.on("data", onData);

    peer.on("close", (err: any) => this.onDisconnect(id, err));

    peer.on("error", (err: any) => this.onDisconnect(id, err));

    this.craftPingMessage().then((msg) => {
      peer.send(msg);
    });
  };

  /**
   * Handle the webrtc peer connection
   */
  private onConnect = (peer: Peer.Instance, id: string, offer_id?: string) => {
    this.onPeerConnect(peer, id);
    this.connectedPeers[id] = true;
    if (offer_id) {
      this.connectedPeers[offer_id] = true;
    }
  };

  /**
   * Clean the announce offers pool
   */
  private cleanPool = () => {
    Object.entries(this.offerPool).forEach(([id, { peer }]) => {
      if (!this.handledOffers[id] && !this.connectedPeers[id]) {
        // this.tooldb.logger("closed peer " + id);
        peer.end();
        peer.destroy();
        delete this.peerMap[id];
        if (Object.keys(this.peerMap).length === 0) {
          this.tooldb.isConnected = false;
          this.tooldb.onDisconnect();
        }
      }
    });

    this.handledOffers = {} as Record<string, boolean>;
  };

  /**
   * Makes a websocket connection to a tracker
   */
  private makeSocket = (url: string, info_hash: string) => {
    return new Promise<WebSocket | null>((resolve) => {
      if (!this.sockets[url]) {
        this.socketListeners[url] = {
          ...this.socketListeners[url],
          // eslint-disable-next-line no-use-before-define
          [info_hash]: this.onSocketMessage,
        };

        try {
          const socket = new this.wss(url);
          // eslint-disable-next-line func-names
          const socks = this.sockets;
          socket.onopen = function () {
            socks[url] = this;
            resolve(this);
          };
          socket.onmessage = (e: any) =>
            Object.values(this.socketListeners[url]).forEach((f) =>
              f(socket, e)
            );
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
  private announce = async (socket: WebSocket, infoHash: string) =>
    socket.send(
      JSON.stringify({
        action: "announce",
        info_hash: infoHash,
        numwant: offerPoolSize,
        peer_id: this.getClientAddress(),
        offers: await Promise.all(
          Object.entries(this.offerPool).map(async ([id, { offerP }]) => {
            const offer = await offerP;
            // this.tooldb.logger(`Created offer id ${id}`);
            return {
              offer_id: id,
              offer,
            };
          })
        ),
      })
    );

  /**
   * Announce ourselves to all trackers
   */
  private announceAll = async () => {
    if (this.offerPool) {
      this.cleanPool();
    }

    this.offerPool = this.makeOffers();

    this.trackerUrls.forEach(async (url: string) => {
      // this.tooldb.logger("begin tracker connection " + url);
      const socket = await this.makeSocket(url, this.infoHash);
      // this.tooldb.logger(" ok tracker " + url);
      // this.tooldb.logger("socket", url, socket);
      if (socket && socket.readyState === 1) {
        // this.tooldb.logger("announce to " + url);
        this.announce(socket, this.infoHash);
      }
    });
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
      offer?: string;
      offer_id: string;
      answer?: string;
    };

    try {
      val = JSON.parse(e.data);
      // this.tooldb.logger("onSocketMessage", socket.url, val);
    } catch (_e: any) {
      // this.tooldb.logger(`${libName}: received malformed SDP JSON`);
      return;
    }

    const failure = val["failure reason"];

    if (failure) {
      this.tooldb.logger(`${e.origin}: torrent tracker failure (${failure})`);
      return;
    }

    if (val.info_hash !== this.infoHash) {
      // this.tooldb.logger("Info hash mismatch");
      return;
    }

    if (val.peer_id && val.peer_id === this.getClientAddress()) {
      // this.tooldb.logger("Peer ids mismatch", val.peer_id, selfId);
      return;
    }

    if (val.offer && val.offer_id) {
      if (this.connectedPeers[val.peer_id]) {
        return;
      }

      if (this.handledOffers[val.offer_id]) {
        return;
      }

      if (Object.keys(this.peerMap).length >= maxPeers) {
        if (this.offerPool) {
          this.cleanPool();
        }
        return;
      }

      this.handledOffers[val.offer_id] = true;

      const peer = this.initPeer(false, false, {});
      peer.once("signal", (answer: any) =>
        socket.send(
          JSON.stringify({
            answer,
            action: "announce",
            info_hash: this.infoHash,
            peer_id: this.getClientAddress(),
            to_peer_id: val.peer_id,
            offer_id: val.offer_id,
          })
        )
      );

      peer.on("connect", () => this.onConnect(peer, val.peer_id));
      peer.on("close", (err: any) => this.onDisconnect(val.peer_id, err));
      peer.signal(val.offer);
      return;
    }

    if (val.answer) {
      if (this.connectedPeers[val.peer_id]) {
        return;
      }

      if (this.handledOffers[val.offer_id]) {
        return;
      }

      const offer = this.offerPool[val.offer_id];

      if (offer) {
        const { peer } = offer;

        if (peer.destroyed) {
          return;
        }

        this.handledOffers[val.offer_id] = true;
        peer.on("connect", () => {
          this.onConnect(peer, val.peer_id, val.offer_id);
        });
        peer.on("close", (err: any) => this.onDisconnect(val.peer_id, err));
        peer.signal(val.answer);
      }
    }
  };

  /**
   * Leave the tracker
   */
  public onLeave = async () => {
    this.trackerUrls.forEach(
      (url) => delete this.socketListeners[url][this.infoHash]
    );
    clearInterval(this.announceInterval);
    this.cleanPool();
  };

  constructor(db: ToolDb) {
    super(db);

    this.announceInterval = setInterval(this.announceAll, announceSecs * 1000);

    setInterval(() => this.peersCheck(), 100);

    // Stop announcing after maxAnnounceSecs
    const intervalStart = new Date().getTime();
    const checkInterval = setInterval(() => {
      if (
        !this.tooldb.options.server &&
        new Date().getTime() - intervalStart > maxAnnounceSecs * 1000
      ) {
        clearInterval(checkInterval);
        clearInterval(this.announceInterval);
      }
    }, 200);

    this.infoHash = sha1(`tooldb:${this.tooldb.options.topic}`).slice(20);

    // Do not announce if we hit our max peers cap
    if (Object.keys(this.peerMap).length < maxPeers) {
      this.announceAll();
    } else {
      if (this.offerPool) {
        this.cleanPool();
      }
    }

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

  public close(clientId: string): void {
    //
  }
}
