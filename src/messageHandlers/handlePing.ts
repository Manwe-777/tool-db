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
    clientId: this.options.peerAccount.address,
    to: [],
    id: message.id,
  } as PongMessage);

  this.network.sendToClientId(remotePeerId, {
    type: "servers",
    servers: this.peers,
    to: [],
    id: textRandom(10),
  } as ServersMessage);
}
