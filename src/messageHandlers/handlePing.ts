import { PingMessage, PongMessage, ToolDb } from "..";

export default function handlePing(
  this: ToolDb,
  message: PingMessage,
  remotePeerId: string
) {
  this.network.sendToClientId(remotePeerId, {
    type: "pong",
    isServer: this.options.server,
    clientId: this.options.id,
    to: [],
    id: message.id,
  } as PongMessage);
}
