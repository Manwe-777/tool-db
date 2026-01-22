import Peer from "simple-peer";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, randomBytes } from "@noble/hashes/utils";

import { ToolDb, sha1, textRandom, ToolDbNetworkAdapter } from "tool-db";

// Import ws for type checking but use conditionally at runtime
import type * as WS from "ws";

// Get WebSocket implementation based on environment
function getWebSocket(): typeof WS | typeof globalThis.WebSocket {
  if (typeof window !== "undefined" || typeof self !== "undefined") {
    // Browser or Web Worker environment - use native WebSocket
    return globalThis.WebSocket as any;
  }
  // Node.js environment - use ws package
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require("ws");
}

const WebSocket = getWebSocket();

type SocketMessageFn = (socket: WebSocket, e: { data: any }) => void;

// Nostr types
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface NostrMessage {
  peerId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  offer_id?: string;
}

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

// Default Nostr relays for peer discovery
const defaultNostrRelayUrls = [
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.data.haus",
  "wss://relay.nostromo.social",
  "wss://relay.fountain.fm",
];

// Nostr event kind for ephemeral peer discovery (20000-30000 range)
const NOSTR_KIND_BASE = 20000;

// Helper to convert hex to bytes
const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

// Helper to hash string to number for kind derivation
const strToNum = (str: string, limit = Number.MAX_SAFE_INTEGER): number =>
  str.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % limit;

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

  // Nostr-specific properties
  private nostrSecretKey!: Uint8Array;
  private nostrPublicKey!: Uint8Array;
  private nostrPubkeyHex!: string;
  private nostrRelays: Record<string, WebSocket | null> = {};
  private nostrRelayUrls = [...defaultNostrRelayUrls];
  private nostrSubscriptionIds: Record<string, string> = {};
  private nostrKind: number = NOSTR_KIND_BASE;
  private nostrTopic: string = "";
  private nostrPendingOffers: Record<string, { peer: Peer.Instance; offer_id: string }> = {};

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

  // ============================================
  // NOSTR PEER DISCOVERY METHODS
  // ============================================

  /**
   * Initialize Nostr keypair for signing events
   */
  private initNostrKeys = () => {
    // Generate random 32-byte secret key
    this.nostrSecretKey = randomBytes(32);
    this.nostrPublicKey = schnorr.getPublicKey(this.nostrSecretKey);
    this.nostrPubkeyHex = bytesToHex(this.nostrPublicKey);
  };

  /**
   * Get the Nostr event kind based on topic
   */
  private getNostrKind = (topic: string): number => {
    return strToNum(topic, 10000) + NOSTR_KIND_BASE;
  };

  /**
   * Create and sign a Nostr event
   */
  private createNostrEvent = async (
    content: string
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      kind: this.nostrKind,
      tags: [["x", this.nostrTopic]],
      created_at: now,
      content,
      pubkey: this.nostrPubkeyHex,
    };

    // Create event ID by hashing serialized event data
    const eventData = JSON.stringify([
      0,
      payload.pubkey,
      payload.created_at,
      payload.kind,
      payload.tags,
      payload.content,
    ]);
    
    // Hash using @noble/hashes (works in both browser and Node.js)
    const encoder = new TextEncoder();
    const eventHash = sha256(encoder.encode(eventData));
    const eventId = bytesToHex(eventHash);
    
    // Sign the event using schnorr
    const signature = schnorr.sign(eventHash, this.nostrSecretKey);
    
    return JSON.stringify([
      "EVENT",
      {
        ...payload,
        id: eventId,
        sig: bytesToHex(signature),
      },
    ]);
  };

  /**
   * Create a Nostr subscription request
   */
  private createNostrSubscription = (subId: string): string => {
    return JSON.stringify([
      "REQ",
      subId,
      {
        kinds: [this.nostrKind],
        since: Math.floor(Date.now() / 1000) - 60, // Last 60 seconds
        "#x": [this.nostrTopic],
      },
    ]);
  };

  /**
   * Create a Nostr unsubscribe request
   */
  private createNostrUnsubscribe = (subId: string): string => {
    return JSON.stringify(["CLOSE", subId]);
  };

  /**
   * Connect to a Nostr relay
   */
  private connectNostrRelay = (url: string): Promise<WebSocket | null> => {
    return new Promise((resolve) => {
      if (this.nostrRelays[url] && this.nostrRelays[url]?.readyState === 1) {
        resolve(this.nostrRelays[url]);
        return;
      }

      try {
        const socket = new this.wss(url);

        socket.onopen = () => {
          this.nostrRelays[url] = socket;
          this.socketRetryPeriods[url] = defaultRetryMs;
          this.tooldb.logger(`Connected to Nostr relay: ${url}`);
          
          // Subscribe to our topic
          const subId = textRandom(16);
          this.nostrSubscriptionIds[url] = subId;
          socket.send(this.createNostrSubscription(subId));
          
          resolve(socket);
        };

        socket.onmessage = (e: any) => {
          this.onNostrMessage(socket, e.data);
        };

        socket.onerror = () => {
          this.tooldb.logger(`Nostr relay error: ${url}`);
        };

        socket.onclose = () => {
          this.nostrRelays[url] = null;
          if (!this.reconnectionPaused) {
            this.scheduleReconnect(url, () => this.connectNostrRelay(url));
          }
        };
      } catch (e) {
        this.tooldb.logger(`Failed to connect to Nostr relay: ${url}`, e);
        resolve(null);
      }
    });
  };

  /**
   * Handle incoming Nostr messages
   */
  private onNostrMessage = async (socket: WebSocket, data: string) => {
    try {
      const msg = JSON.parse(data);
      const [msgType, subIdOrPayload, payload] = msg;

      if (msgType !== "EVENT") {
        // Handle NOTICE, OK, EOSE messages
        if (msgType === "NOTICE") {
          this.tooldb.logger(`Nostr relay notice: ${subIdOrPayload}`);
        }
        return;
      }

      const event = payload as NostrEvent;
      
      // Ignore our own events
      if (event.pubkey === this.nostrPubkeyHex) {
        return;
      }

      // Verify the event tag matches our topic
      const topicTag = event.tags.find((t) => t[0] === "x");
      if (!topicTag || topicTag[1] !== this.nostrTopic) {
        return;
      }

      // Parse the content
      let content: NostrMessage;
      try {
        content = JSON.parse(event.content);
      } catch {
        return;
      }

      const { peerId, offer, answer, offer_id } = content;

      // Skip if we're already connected to this peer
      if (this.connectedPeers[peerId]) {
        return;
      }

      // Handle peer announcement (no offer/answer = initial announcement)
      if (peerId && !offer && !answer) {
        // Someone announced themselves, send them an offer
        await this.sendNostrOffer(socket, peerId);
        return;
      }

      // Handle incoming offer
      if (offer && offer_id) {
        await this.handleNostrOffer(socket, peerId, offer, offer_id);
        return;
      }

      // Handle incoming answer
      if (answer && offer_id) {
        await this.handleNostrAnswer(peerId, answer, offer_id);
        return;
      }
    } catch (e) {
      this.tooldb.logger("Nostr message parse error:", e);
    }
  };

  /**
   * Send an offer to a specific peer via Nostr
   */
  private sendNostrOffer = async (socket: WebSocket, targetPeerId: string) => {
    if (Object.keys(this.peerMap).length >= maxPeers) {
      return;
    }

    const peer = this.initPeer(true, false, {});
    const offer_id = textRandom(20);

    this.nostrPendingOffers[offer_id] = { peer, offer_id };

    peer.once("signal", async (offer: any) => {
      const content = JSON.stringify({
        peerId: this.getClientAddress(),
        offer,
        offer_id,
        targetPeerId, // Include target so only they respond
      });
      
      const event = await this.createNostrEvent(content);
      if (socket.readyState === 1) {
        socket.send(event);
      }
    });

    // Clean up offer after timeout
    setTimeout(() => {
      if (this.nostrPendingOffers[offer_id] && !peer.connected) {
        peer.destroy();
        delete this.nostrPendingOffers[offer_id];
      }
    }, iceGatheringTimeout * 2);
  };

  /**
   * Handle an incoming Nostr offer
   */
  private handleNostrOffer = async (
    socket: WebSocket,
    peerId: string,
    offer: RTCSessionDescriptionInit,
    offer_id: string
  ) => {
    if (Object.keys(this.peerMap).length >= maxPeers) {
      return;
    }

    if (this.handledOffers[offer_id]) {
      return;
    }

    this.handledOffers[offer_id] = true;

    const peer = this.initPeer(false, false, {});

    peer.once("signal", async (answer: any) => {
      const content = JSON.stringify({
        peerId: this.getClientAddress(),
        answer,
        offer_id,
      });
      
      const event = await this.createNostrEvent(content);
      if (socket.readyState === 1) {
        socket.send(event);
      }
    });

    peer.on("connect", () => this.onConnect(peer, peerId, offer_id));
    peer.on("close", (err: any) => this.onDisconnect(peerId, err));
    peer.on("error", (err: any) => this.onDisconnect(peerId, err));

    peer.signal(offer);
  };

  /**
   * Handle an incoming Nostr answer
   */
  private handleNostrAnswer = async (
    peerId: string,
    answer: RTCSessionDescriptionInit,
    offer_id: string
  ) => {
    const pendingOffer = this.nostrPendingOffers[offer_id];
    
    if (!pendingOffer) {
      return;
    }

    if (this.handledOffers[offer_id]) {
      return;
    }

    this.handledOffers[offer_id] = true;

    const { peer } = pendingOffer;

    if (peer.destroyed) {
      delete this.nostrPendingOffers[offer_id];
      return;
    }

    peer.on("connect", () => {
      this.onConnect(peer, peerId, offer_id);
      delete this.nostrPendingOffers[offer_id];
    });
    peer.on("close", (err: any) => this.onDisconnect(peerId, err));
    peer.on("error", (err: any) => this.onDisconnect(peerId, err));

    peer.signal(answer);
  };

  /**
   * Announce ourselves to a Nostr relay
   */
  private announceToNostr = async (socket: WebSocket) => {
    const content = JSON.stringify({
      peerId: this.getClientAddress(),
    });
    
    const event = await this.createNostrEvent(content);
    if (socket.readyState === 1) {
      socket.send(event);
    }
  };

  /**
   * Announce to all Nostr relays
   */
  private announceToAllNostrRelays = async () => {
    for (const url of this.nostrRelayUrls) {
      const socket = await this.connectNostrRelay(url);
      if (socket && socket.readyState === 1) {
        await this.announceToNostr(socket);
      }
    }
  };

  // ============================================
  // END NOSTR METHODS
  // ============================================

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
   * Announce ourselves to all trackers and Nostr relays
   */
  private announceAll = async () => {
    if (this.offerPool) {
      this.cleanPool();
    }

    this.offerPool = this.makeOffers();

    // Announce to WebTorrent trackers
    this.trackerUrls.forEach(async (url: string) => {
      const socket = await this.makeSocket(url, this.infoHash);
      if (socket && socket.readyState === 1) {
        this.announce(socket, this.infoHash);
      }
    });

    // Also announce to Nostr relays
    this.announceToAllNostrRelays();
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
   * Leave the tracker and Nostr relays
   */
  public onLeave = async () => {
    // Remove online/offline listeners
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }

    // Clean up WebTorrent tracker subscriptions
    this.trackerUrls.forEach(
      (url) => delete this.socketListeners[url][this.infoHash]
    );

    // Clean up Nostr relay subscriptions
    Object.entries(this.nostrSubscriptionIds).forEach(([url, subId]) => {
      const relay = this.nostrRelays[url];
      if (relay && relay.readyState === 1) {
        relay.send(this.createNostrUnsubscribe(subId));
      }
    });
    this.nostrSubscriptionIds = {};

    // Close Nostr relay connections
    Object.values(this.nostrRelays).forEach((relay) => {
      if (relay) relay.close();
    });
    this.nostrRelays = {};

    if (this.announceInterval) clearInterval(this.announceInterval);
    if (this.peersCheckInterval) clearInterval(this.peersCheckInterval);
    this.cleanPool();
  };

  constructor(db: ToolDb) {
    super(db);

    // Initialize Nostr keys for peer discovery
    this.initNostrKeys();

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

    // Initialize Nostr topic and kind based on app topic
    this.nostrTopic = `tooldb:${this.tooldb.options.topic}`;
    this.nostrKind = this.getNostrKind(this.nostrTopic);

    // Check for custom Nostr configuration in modules
    const nostrConfig = this.tooldb.options.modules?.nostr as {
      enabled?: boolean;
      relayUrls?: string[];
    } | undefined;

    // Allow disabling Nostr if needed (enabled by default)
    if (nostrConfig?.enabled === false) {
      this.nostrRelayUrls = [];
      this.tooldb.logger("Nostr peer discovery disabled via config");
    } else {
      // Use custom relay URLs if provided
      if (nostrConfig?.relayUrls && nostrConfig.relayUrls.length > 0) {
        this.nostrRelayUrls = nostrConfig.relayUrls;
      }
      this.tooldb.logger(`Nostr peer discovery enabled - topic: ${this.nostrTopic}, kind: ${this.nostrKind}, relays: ${this.nostrRelayUrls.length}`);
    }

    // Wait for ToolDb to initialize before announcing
    // This ensures the peer account and keys are ready before we try to sign messages
    this.tooldb.once("init", () => {
      // Do not announce if we hit our max peers cap
      if (Object.keys(this.peerMap).length < maxPeers) {
        this.announceAll();
      } else {
        if (this.offerPool) {
          this.cleanPool();
        }
      }
    });

    // Basically the same as the WS network adapter
    // Only for Node!
    if (this.tooldb.options.server && typeof window === "undefined") {
      // In Node.js, WebSocket is the 'ws' package with Server support
      const WSModule = WebSocket as typeof WS;
      const server = new WSModule.Server({
        port: this.tooldb.options.port,
        server: this.tooldb.options.httpServer,
      });

      server.on("connection", (socket: WS.WebSocket) => {
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

        socket.on("message", (message: WS.RawData) => {
          const messageStr = message.toString();
          this.onClientMessage(messageStr, clientId || "", (id) => {
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
