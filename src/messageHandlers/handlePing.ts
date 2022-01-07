import {
  PingMessage,
  PongMessage,
  ServersMessage,
  textRandom,
  ToolDb,
} from "..";

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

  this.network.sendToClientId(remotePeerId, {
    type: "servers",
    servers: this.peers,
    to: [],
    id: textRandom(10),
  } as ServersMessage);
}
