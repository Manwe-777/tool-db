import { ToolDb } from "..";
import { PingMessage, PongMessage, ServersMessage } from "../types/message";
import textRandom from "../utils/textRandom";

export default function handlePing(
  this: ToolDb,
  message: PingMessage,
  remotePeerId: string
) {
  if (!this.isConnected) {
    this.isConnected = true;
    this.onConnect();
  }

  this.network.sendToClientId(remotePeerId, {
    type: "pong",
    isServer: this.options.server,
    clientId: this.network.getClientAddress(),
    to: [],
    id: message.id,
  } as PongMessage);

  this.sendJoin(remotePeerId);

  this.network.sendToClientId(remotePeerId, {
    type: "servers",
    servers: this.peers,
    to: [],
    id: textRandom(10),
  } as ServersMessage);
}
