import { ToolDb } from "..";

import { PongMessage } from "../types/message";

export default function handlePong(
  this: ToolDb,
  message: PongMessage,
  remotePeerId: string
) {
  if (!this.isConnected) {
    this.isConnected = true;
    this.onConnect();
  }

  this.onPeerConnect(this.peerAccount.getAddress() || "");
  this.sendJoin(remotePeerId);
}
