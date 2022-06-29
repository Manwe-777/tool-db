import { ToolDb } from "..";
import { JoinMessage, ServersMessage } from "../types/message";
import verifyPeer from "../utils/verifyPeer";

export default function handleJoin(
  this: ToolDb,
  message: JoinMessage,
  remotePeerId: string
) {
  verifyPeer(this, message.peer).then((verified) => {
    if (verified) {
      // Add this peer to our list of peers
      const filteredPeers = this.peers.filter(
        (p) => p.address !== message.peer.address
      );
      if (
        filteredPeers.length === 0 &&
        message.peer.host &&
        message.peer.port
      ) {
        // Add this peer to the list
        this.peers.push(message.peer);
        // Reply with our servers list
        this.network.sendToClientId(remotePeerId, {
          type: "servers",
          servers: this.peers.filter((p) => p.topic === message.peer.topic),
          id: message.id,
        } as ServersMessage);

        // If we are a server ourselves we broadcast this message
        if (this.options.server) {
          this.network.sendToAll(message, true);
        }
      }
    } else {
      this.logger("Blocked a remote peer from joining; ", message);
    }
  });
}
