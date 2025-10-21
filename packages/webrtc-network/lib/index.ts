import { joinRoom } from "trystero";
import type { ActionSender, Room } from "trystero";
import WebSocket from "ws";

import { ToolDb, ToolDbNetworkAdapter, sha1 } from "tool-db";
import type { ToolDbMessage } from "tool-db";

const TOOLDB_ACTION = "tdb-msg";
const DEFAULT_RELAY_REDUNDANCY = 5;

const DEFAULT_NOSTR_RELAY_URLS = [
  "wss://black.nostrcity.club",
  "wss://ftp.halifax.rwth-aachen.de/nostr",
  "wss://nos.lol",
  "wss://nostr.cool110.xyz",
  "wss://nostr.data.haus",
  "wss://nostr.sathoarder.com",
  "wss://nostr.vulpem.com",
  "wss://relay.agorist.space",
  "wss://relay.binaryrobot.com",
  "wss://relay.damus.io",
  "wss://relay.fountain.fm",
  "wss://relay.mostro.network",
  "wss://relay.nostraddress.com",
  "wss://relay.nostrdice.com",
  "wss://relay.nostromo.social",
  "wss://relay.oldenburg.cool",
  "wss://relay.verified-nostr.com",
  "wss://yabu.me/v2",
];

type JoinRoomConfig = Parameters<typeof joinRoom>[0];

type TrysteroTurnServer = NonNullable<JoinRoomConfig["turnConfig"]>[number];

interface TrysteroOptions {
  appId?: string;
  roomId?: string;
  relayUrls?: string[];
  relayRedundancy?: number;
  password?: string;
  manualRelayReconnection?: boolean;
}

interface WebrtcModuleOptions {
  rtcConfig?: RTCConfiguration;
  turnConfig?: TrysteroTurnServer[];
  trystero?: TrysteroOptions;
}

export default class toolDbWebrtc extends ToolDbNetworkAdapter {
  private wnd =
    typeof window === "undefined" ? undefined : (window as any | undefined);

  private wss = this.wnd
    ? this.wnd.WebSocket || this.wnd.webkitWebSocket || this.wnd.mozWebSocket
    : WebSocket;

  private room: Room | null = null;

  private sendMessageAction: ActionSender<string> | null = null;

  private peerIdToClientId: Record<string, string> = {};

  private clientIdToPeerId: Record<string, string> = {};

  private activePeerIds = new Set<string>();

  private infoHash = "";

  constructor(db: ToolDb) {
    super(db);

    this.tooldb.ready
      .then(() => {
        this.tooldb.logger("webrtc-network constructor (trystero)");
        this.infoHash = sha1(`tooldb:${this.tooldb.options.topic}`).slice(20);
        this.initializeRoom();

        if (this.tooldb.options.server && typeof window === "undefined") {
          this.setupServerSockets();
        }
      })
      .catch((err) => {
        this.tooldb.logger("Failed to initialize webrtc network", err);
      });
  }

  private getModuleOptions(): WebrtcModuleOptions {
    return (
      (this.tooldb.options.modules?.webrtc as WebrtcModuleOptions | undefined) ??
      {}
    );
  }

  private initializeRoom() {
    const moduleOptions = this.getModuleOptions();
    const trysteroOptions = moduleOptions.trystero ?? {};

    const appId =
      trysteroOptions.appId || this.tooldb.options.topic || "tool-db";
    const roomId = trysteroOptions.roomId || this.infoHash;

    const config: JoinRoomConfig = {
      appId,
    };

    if (moduleOptions.rtcConfig) {
      config.rtcConfig = moduleOptions.rtcConfig;
    }

    if (moduleOptions.turnConfig) {
      config.turnConfig = moduleOptions.turnConfig;
    }

    if (typeof trysteroOptions.password === "string") {
      config.password = trysteroOptions.password;
    }

    if (
      Array.isArray(trysteroOptions.relayUrls) &&
      trysteroOptions.relayUrls.length > 0
    ) {
      config.relayUrls = trysteroOptions.relayUrls;

      if (typeof trysteroOptions.relayRedundancy === "number") {
        config.relayRedundancy = trysteroOptions.relayRedundancy;
      }
    } else {
      config.relayUrls = DEFAULT_NOSTR_RELAY_URLS;
      config.relayRedundancy =
        trysteroOptions.relayRedundancy ?? DEFAULT_RELAY_REDUNDANCY;
    }

    this.room = joinRoom(config, roomId, (details) => {
      this.tooldb.logger(
        "Trystero join error",
        `${details.error} (appId: ${appId}, roomId: ${roomId})`
      );
    });

    const [sendMessage, receiveMessage] =
      this.room.makeAction<string>(TOOLDB_ACTION);
    this.sendMessageAction = sendMessage;

    receiveMessage((payload, peerId) => {
      this.handleIncomingMessage(peerId, payload);
    });

    this.room.onPeerJoin((peerId) => this.handlePeerJoin(peerId));
    this.room.onPeerLeave((peerId) => this.handlePeerLeave(peerId));
  }

  private handlePeerJoin(peerId: string) {
    this.tooldb.logger("Trystero peer joined", peerId);
    this.activePeerIds.add(peerId);

    this.craftPingMessage()
      .then((msg) => this.sendToPeer(peerId, msg))
      .catch((err) => {
        this.tooldb.logger("Failed to craft ping", err);
      });
  }

  private handlePeerLeave(peerId: string) {
    this.tooldb.logger("Trystero peer left", peerId);
    this.activePeerIds.delete(peerId);

    const clientId = this.peerIdToClientId[peerId];
    if (clientId) {
      this.onClientDisconnect(clientId);
      delete this.peerIdToClientId[peerId];
      delete this.clientIdToPeerId[clientId];
      delete this.clientToSend[clientId];
      delete this.isClientConnected[clientId];
      this.tooldb.onPeerDisconnect(clientId);
    }

    if (this.activePeerIds.size === 0) {
      this.tooldb.isConnected = false;
      this.tooldb.onDisconnect();
    }
  }

  private handleIncomingMessage(peerId: string, payload: unknown) {
    if (!this.activePeerIds.has(peerId)) {
      this.activePeerIds.add(peerId);
    }

    if (typeof payload !== "string") {
      this.tooldb.logger(
        "Ignoring non-string payload from peer",
        peerId,
        typeof payload
      );
      return;
    }

    const currentClientId = this.peerIdToClientId[peerId] || "";

    this.onClientMessage(payload, currentClientId, (newClientId) => {
      this.associatePeer(peerId, newClientId);
    });
  }

  private associatePeer(peerId: string, clientId: string) {
    const previousPeer = this.clientIdToPeerId[clientId];
    if (previousPeer && previousPeer !== peerId) {
      delete this.peerIdToClientId[previousPeer];
    }

    this.peerIdToClientId[peerId] = clientId;
    this.clientIdToPeerId[clientId] = peerId;

    this.isClientConnected[clientId] = () =>
      this.activePeerIds.has(peerId) && !!this.room;

    this.clientToSend[clientId] = (message: string) => {
      this.sendToPeer(peerId, message);
    };

    if (!this.tooldb.isConnected) {
      this.tooldb.isConnected = true;
      this.tooldb.onConnect();
    }
  }

  private sendToPeer(peerId: string, message: string) {
    if (!this.sendMessageAction) {
      this.tooldb.logger(
        "sendMessageAction not ready, dropping message for peer",
        peerId
      );
      return;
    }

    void this.sendMessageAction(message, peerId).catch((err: unknown) => {
      this.tooldb.logger(`Failed to send message to ${peerId}`, err);
    });
  }

  private setupServerSockets() {
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

  public close(_clientId: string): void {
    // Trystero rooms are shared per adapter; leaving here would
    // disconnect all peers. Consumers can dispose the adapter via ToolDb.close().
  }

  public sendToAll(msg: ToolDbMessage, crossServerOnly = false) {
    if (crossServerOnly) {
      super.sendToAll(msg, crossServerOnly);
      return;
    }

    const to = msg.to ?? [];
    const connectedClientIds = Object.keys(this.clientToSend).filter((id) =>
      this.isConnected(id)
    );

    connectedClientIds.forEach((clientId) => {
      if (!to.includes(clientId)) {
        this.clientToSend[clientId](JSON.stringify({ ...msg }));
      }
    });
  }
}
