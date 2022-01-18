import _ from "lodash";
import Peer from "simple-peer";

import { PingMessage, sha1, textRandom, ToolDbMessage } from ".";
import { ToolDbNetworkAdapter } from "./types/tooldb";
import ToolDb from "./tooldb";

export type ToolDbWebSocket = WebSocket & {
  toolDbId?: string;
  isServer: boolean;
  origUrl: string;
};

type SocketMessageFn = (socket: WebSocket, e: { data: any }) => void;

type IOffers = Record<
  string,
  {
    peer: Peer.Instance;
    offerP: Promise<Peer.Instance>;
  }
>;

const offerPoolSize = 10;
const defaultAnnounceSecs = 33;
const maxAnnounceSecs = 120;

const defaultTrackerUrls = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.webtorrent.io",
  "wss://tracker.files.fm:7073/announce",
  "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
];

export default class toolDbWebrtc extends ToolDbNetworkAdapter {
  private _tooldb: ToolDb;

  private sockets: Record<string, WebSocket | null> = {};

  private socketListeners: Record<string, Record<string, SocketMessageFn>> = {};

  private peerMap: Record<string, Peer.Instance> = {};

  private connectedPeers: Record<string, boolean> = {};

  private onDisconnect = (id: string) => delete this.connectedPeers[id];

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
      initiator,
      trickle,
      config: rtcConfig,
    });
    return peer;
  };

  private announceSecs = defaultAnnounceSecs;

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
   * Make connection offerst to send to the tracker
   */
  private makeOffers = () => {
    const offers: IOffers = {};

    new Array(offerPoolSize).fill(0).forEach(() => {
      const peer = this.initPeer(true, false, {});
      const oid = textRandom(20);
      offers[oid] = {
        peer,
        offerP: new Promise((res) => peer.once("signal", res)),
      };
    });
    return offers;
  };

  /**
   * When we sucessfully connect to a webrtc peer
   */
  private onPeerConnect = (peer: Peer.Instance, id: string) => {
    if (this.peerMap[id]) {
      return;
    }

    const onData = (data: Uint8Array) => {
      const str = new TextDecoder().decode(data);
      try {
        const msg = JSON.parse(str);
        this.tooldb.clientOnMessage(msg, id);
      } catch (e) {
        //
      }
    };

    this.peerMap[id] = peer;

    peer.on("data", onData);

    peer.on("close", () => console.log("close > ", id));

    peer.send(
      JSON.stringify({
        type: "ping",
      } as PingMessage)
    );
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
        peer.destroy();
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
          const socket = new WebSocket(url);
          // eslint-disable-next-line func-names
          const socks = this.sockets;
          socket.onopen = function () {
            socks[url] = this;
            resolve(this);
          };
          socket.onmessage = (e) =>
            Object.values(this.socketListeners[url]).forEach((f) =>
              f(socket, e)
            );
          // eslint-disable-next-line func-names
          socket.onerror = function () {
            resolve(null);
          };
        } catch (e) {
          resolve(null);
        }
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
        peer_id: encodeURIComponent(this.tooldb.options.id),
        offers: await Promise.all(
          Object.entries(this.offerPool).map(async ([id, { offerP }]) => {
            const offer = await offerP;
            // console.warn(`Created offer id ${id}`);
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
      const socket = await this.makeSocket(url, this.infoHash);
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.announce(socket, this.infoHash);
      }
    });
  };

  /**
   * Handle the tracker messages
   */
  private onSocketMessage: SocketMessageFn = async (
    socket: WebSocket,
    e: { data: any }
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
      // console.log("onSocketMessage", socket.url, val);
    } catch (_e: any) {
      // console.error(`${libName}: received malformed SDP JSON`);
      return;
    }

    if (val.info_hash !== this.infoHash) {
      // console.warn("Info hash mismatch");
      return;
    }

    if (
      val.peer_id &&
      val.peer_id === encodeURIComponent(this.tooldb.options.id)
    ) {
      // console.warn("Peer ids mismatch", val.peer_id, selfId);
      return;
    }

    const failure = val["failure reason"];

    if (failure) {
      // console.warn(`${libName}: torrent tracker failure (${failure})`);
      return;
    }

    if (
      val.interval &&
      val.interval > this.announceSecs &&
      val.interval <= maxAnnounceSecs
    ) {
      clearInterval(this.announceInterval);
      this.announceSecs = val.interval;
      this.announceInterval = setInterval(
        this.announceAll,
        this.announceSecs * 1000
      );
    }

    if (val.offer && val.offer_id) {
      if (this.connectedPeers[val.peer_id]) {
        return;
      }

      if (this.handledOffers[val.offer_id]) {
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
            peer_id: encodeURIComponent(this.tooldb.options.id),
            to_peer_id: val.peer_id,
            offer_id: val.offer_id,
          })
        )
      );

      peer.on("connect", () => this.onConnect(peer, val.peer_id));
      peer.on("close", () => this.onDisconnect(val.peer_id));
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
        peer.on("connect", () =>
          this.onConnect(peer, val.peer_id, val.offer_id)
        );
        peer.on("close", () => this.onDisconnect(val.peer_id));
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
    this._tooldb = db;

    this.announceInterval = setInterval(
      this.announceAll,
      this.announceSecs * 1000
    );
    this.infoHash = sha1(`tooldb:${this.tooldb.options.topic}`).slice(20);
    this.announceAll();
  }

  public close(clientId: string): void {
    //
  }

  public sendToAll(
    msg: ToolDbMessage,
    crossServerOnly = false,
    isRelay = false
  ) {
    const to = _.uniq([...msg.to, encodeURIComponent(this.tooldb.options.id)]);

    Object.keys(this.peerMap)
      .filter((id) => !to.includes(id))
      .forEach((id) => {
        const peer = this.peerMap[id];
        if (peer.connected) {
          if (this.tooldb.options.debug) {
            console.log("Sent out to: ", id);
            // console.log("OUT > ", { ...msg, to });
          }
          peer.send(JSON.stringify({ ...msg, to }));
        } else {
          peer.destroy();
          delete this.peerMap[id];
        }
      });
  }

  public sendToClientId(clientId: string, msg: ToolDbMessage) {
    Object.keys(this.peerMap)
      .filter((id) => id === clientId)
      .forEach((id) => {
        const peer = this.peerMap[id];

        if (peer.connected) {
          const to = _.uniq([
            ...msg.to,
            encodeURIComponent(this.tooldb.options.id),
          ]);
          peer.send(JSON.stringify({ ...msg, to }));
        } else {
          peer.destroy();
          delete this.peerMap[id];
        }
      });
  }

  get tooldb() {
    return this._tooldb;
  }
}
