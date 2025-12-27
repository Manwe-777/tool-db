import Peer from "simple-peer";
import WebSocket from "ws";

import { ToolDb, sha1, textRandom, ToolDbNetworkAdapter } from "tool-db";

type SocketMessageFn = (socket: WebSocket, e: { data: any }) => void;

type IOffers = Record<
  string,
  {
    peer: Peer.Instance;
    offerP: Promise<Peer.Instance>;
  }
>;

// Increased offer pool size for better peer discovery (was 5)
const offerPoolSize = 10;
const maxPeers = 4;
const announceSecs = 33;
const maxAnnounceSecs = 99999999;

// ICE gathering timeout to prevent hangs
const iceGatheringTimeout = 5000;

// Reconnection settings
const defaultRetryMs = 3333;
const maxRetryMs = 120000;

// Default ICE servers for better connectivity
const defaultIceServers: RTCConfiguration["iceServers"] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

// Updated tracker list (removed dead heroku tracker)
const defaultTrackerUrls = [
  "wss://tracker.webtorrent.dev",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.files.fm:7073/announce",
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

  // Track socket retry periods for exponential backoff
  private socketRetryPeriods: Record<string, number> = {};

  // Track if reconnection is paused (e.g., when offline)
  private reconnectionPaused = false;
  private pendingReconnections: Array<() => void> = [];

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
      const peer = this.peerMap[id];
      // Use connection state instead of just checking isConnected
      if (peer && this.isPeerDisconnected(peer)) {
        this.tooldb.logger("disconnected from " + id);
        this.onClientDisconnect(id);
        peer.destroy();
        if (this.connectedPeers[id]) delete this.connectedPeers[id];
        delete this.peerMap[id];
      }
    });

    if (Object.keys(this.peerMap).length === 0) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }
  }

  // Check if a peer is in a disconnected state
  private isPeerDisconnected(peer: Peer.Instance): boolean {
    if (!peer.connected) return true;
    // Access underlying RTCPeerConnection if available
    const pc = (peer as any)._pc as RTCPeerConnection | undefined;
    if (pc) {
      const state = pc.connectionState;
      return ["disconnected", "failed", "closed"].includes(state);
    }
    return !peer.connected;
  }

  private announceInterval: ReturnType<typeof setInterval> | undefined;
  private peersCheckInterval: ReturnType<typeof setInterval> | undefined;

  // Online/offline event handlers
  private handleOnline = () => {
    this.tooldb.logger("Network online - resuming reconnections");
    this.reconnectionPaused = false;
    // Process any pending reconnections
    const pending = this.pendingReconnections.splice(0);
    pending.forEach((fn) => fn());
    // Re-announce to all trackers
    this.announceAll();
  };

  private handleOffline = () => {
    this.tooldb.logger("Network offline - pausing reconnections");
    this.reconnectionPaused = true;
  };

  /**
   * Initialize webrtc peer with proper ICE configuration
   */
  private initPeer = (
    initiator: boolean,
    trickle: boolean,
    rtcConfig: RTCConfiguration
  ) => {
    const peer: Peer.Instance = new Peer({
      wrtc: (this.tooldb.options as any).wrtc,
      initiator,
      trickle,
      config: {
        ...rtcConfig,
        iceServers: [
          ...(defaultIceServers || []),
          ...(rtcConfig.iceServers || []),
        ],
      },
    });

    // Add ICE gathering timeout to prevent hangs
    if (initiator) {
      const timeoutId = setTimeout(() => {
        if (!peer.connected && !peer.destroyed) {
          this.tooldb.logger("ICE gathering timeout, destroying peer");
          peer.destroy();
        }
      }, iceGatheringTimeout);

      peer.once("connect", () => clearTimeout(timeoutId));
      peer.once("close", () => clearTimeout(timeoutId));
      peer.once("error", () => clearTimeout(timeoutId));
    }

    return peer;
  };

  private handledOffers: Record<string, boolean> = {};

  private offerPool: Record<
    string,
    {
      peer: Peer.Instance;
      offerP: Promise<Peer.Instance>;
      created: number;
    }
  > = {};

  private trackerUrls = [...defaultTrackerUrls];

  private infoHash = "";

  /**
   * Make connection offers (sdp) to send to the tracker
   */
  private makeOffers = () => {
    const offers: IOffers & { [key: string]: { created: number } } = {};

    new Array(offerPoolSize).fill(0).forEach(() => {
      try {
        const peer = this.initPeer(true, false, {});
        const oid = textRandom(20);
        offers[oid] = {
          peer,
          offerP: new Promise((res) => peer.once("signal", res)),
          created: Date.now(),
        };
      } catch (e) {
        this.tooldb.logger(e);
      }
    });
    return offers;
  };

  /**
   * When we successfully connect to a webrtc peer
   */
  private onPeerConnect = (peer: Peer.Instance, id: string) => {
    if (this.peerMap[id]) {
      this.peerMap[id].end();
      this.peerMap[id].destroy();
      delete this.peerMap[id];
    }

    let clientId: string | null = null;

    const onData = (data: Uint8Array) => {
      const str = new TextDecoder().decode(data);

      this.onClientMessage(str, clientId || "", (id) => {
        clientId = id;
        // Set this socket's functions on the adapter
        this.isClientConnected[id] = () => {
          return peer.connected;
        };

        this.clientToSend[id] = (_msg: string) => {
          // Check buffer before sending to handle backpressure
          const channel = (peer as any)._channel as RTCDataChannel | undefined;
          if (channel && channel.bufferedAmount > 65535) {
            // Wait for buffer to drain
            const sendWhenReady = () => {
              if (channel.bufferedAmount <= 65535) {
                channel.removeEventListener("bufferedamountlow", sendWhenReady);
                peer.send(_msg);
              }
            };
            channel.addEventListener("bufferedamountlow", sendWhenReady);
          } else {
            peer.send(_msg);
          }
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
   * Clean the announce offers pool - also removes stale offers
   */
  private cleanPool = () => {
    const now = Date.now();
    const offerTtl = 57000; // 57 seconds TTL for offers

    Object.entries(this.offerPool).forEach(([id, offer]) => {
      const isStale = now - offer.created > offerTtl;
      if (isStale || (!this.handledOffers[id] && !this.connectedPeers[id])) {
        offer.peer.end();
        offer.peer.destroy();
        delete this.peerMap[id];
        delete this.offerPool[id];
      }
    });

    if (Object.keys(this.peerMap).length === 0) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }

    this.handledOffers = {} as Record<string, boolean>;
  };

  /**
   * Makes a websocket connection to a tracker with exponential backoff reconnection
   */
  private makeSocket = (url: string, info_hash: string) => {
    return new Promise<WebSocket | null>((resolve) => {
      if (!this.sockets[url]) {
        this.socketListeners[url] = {
          ...this.socketListeners[url],
          [info_hash]: this.onSocketMessage,
        };

        const connect = () => {
          if (this.reconnectionPaused) {
            // Queue reconnection for when we're back online
            this.pendingReconnections.push(() => connect());
            resolve(null);
            return;
          }

          try {
            const socket = new this.wss(url);
            const socks = this.sockets;

            socket.onopen = () => {
              socks[url] = socket;
              // Reset retry period on successful connection
              this.socketRetryPeriods[url] = defaultRetryMs;
              resolve(socket);
            };

            socket.onmessage = (e: any) =>
              Object.values(this.socketListeners[url]).forEach((f) =>
                f(socket, e)
              );

            // Exponential backoff reconnection instead of removing tracker
            socket.onerror = () => {
              this.tooldb.logger(`Tracker error: ${url}, will retry...`);
            };

            socket.onclose = () => {
              this.sockets[url] = null;

              if (this.reconnectionPaused) {
                this.pendingReconnections.push(() => this.reconnectSocket(url, info_hash));
                return;
              }

              this.reconnectSocket(url, info_hash);
            };
          } catch (e) {
            this.tooldb.logger(`Failed to connect to tracker: ${url}`, e);
            // Schedule retry with backoff
            this.scheduleReconnect(url, () => connect());
            resolve(null);
          }
        };

        connect();
      } else {
        resolve(this.sockets[url]);
      }
    });
  };

  /**
   * Reconnect to a socket with exponential backoff
   */
  private reconnectSocket = (url: string, info_hash: string) => {
    this.scheduleReconnect(url, () => {
      this.makeSocket(url, info_hash).then((socket) => {
        if (socket && socket.readyState === 1) {
          this.announce(socket, this.infoHash);
        }
      });
    });
  };

  /**
   * Schedule a reconnection with exponential backoff
   */
  private scheduleReconnect = (url: string, callback: () => void) => {
    if (!this.socketRetryPeriods[url]) {
      this.socketRetryPeriods[url] = defaultRetryMs;
    }

    const retryMs = this.socketRetryPeriods[url];
    this.tooldb.logger(`Scheduling reconnect to ${url} in ${retryMs}ms`);

    setTimeout(() => {
      if (!this.reconnectionPaused) {
        callback();
      } else {
        this.pendingReconnections.push(callback);
      }
    }, retryMs);

    // Increase backoff for next time, up to max
    this.socketRetryPeriods[url] = Math.min(retryMs * 2, maxRetryMs);
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
      if (socket && socket.readyState === 1) {
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
      "warning message"?: string;
      interval?: number;
      offer?: string;
      offer_id: string;
      answer?: string;
    };

    try {
      val = JSON.parse(e.data);
    } catch (_e: any) {
      return;
    }

    const failure = val["failure reason"];
    const warning = val["warning message"];

    if (failure) {
      this.tooldb.logger(`${(socket as any).url}: tracker failure (${failure})`);
      return;
    }

    if (warning) {
      this.tooldb.logger(`${(socket as any).url}: tracker warning (${warning})`);
    }

    // Respect tracker's interval recommendation
    if (val.interval && val.interval * 1000 > announceSecs * 1000) {
      // Could adjust announce interval here if needed
    }

    if (val.info_hash !== this.infoHash) {
      return;
    }

    if (val.peer_id && val.peer_id === this.getClientAddress()) {
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
          this.onDisconnect(val.peer_id, "destroyed");
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
    // Remove online/offline listeners
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }

    this.trackerUrls.forEach(
      (url) => delete this.socketListeners[url][this.infoHash]
    );
    if (this.announceInterval) clearInterval(this.announceInterval);
    if (this.peersCheckInterval) clearInterval(this.peersCheckInterval);
    this.cleanPool();
  };

  constructor(db: ToolDb) {
    super(db);

    // Set up online/offline event handlers for resilience
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }

    this.announceInterval = setInterval(this.announceAll, announceSecs * 1000);

    // Reduced polling frequency - now 1 second instead of 100ms
    // Connection state changes are also detected via peer events
    this.peersCheckInterval = setInterval(() => this.peersCheck(), 1000);

    // Stop announcing after maxAnnounceSecs
    const intervalStart = new Date().getTime();
    const checkInterval = setInterval(() => {
      if (
        !this.tooldb.options.server &&
        new Date().getTime() - intervalStart > maxAnnounceSecs * 1000
      ) {
        clearInterval(checkInterval);
        if (this.announceInterval) clearInterval(this.announceInterval);
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
    const peer = Object.entries(this.peerMap).find(([_, p]) => {
      // Find peer by clientId if possible
      return this.clientToSend[clientId] !== undefined;
    });
    if (peer) {
      peer[1].destroy();
      delete this.peerMap[peer[0]];
    }
  }
}
