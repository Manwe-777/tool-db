import { JoinMessage, ServersMessage, ToolDb } from "..";
import verifyPeer from "../utils/verifyPeer";

export default function handleJoin(
  this: ToolDb,
  message: JoinMessage,
  remotePeerId: string
) {
  verifyPeer(message.peer).then((verified) => {
    // Add this peer to our list of peers
    if (verified) {
      const filteredPeers = this.peers.filter(
        (p) => p.pubkey !== message.peer.pubkey
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
      console.warn("Blocked a remote peer from joining; ", message);
    }
  });
}
