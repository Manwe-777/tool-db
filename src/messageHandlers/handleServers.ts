import { ToolDb } from "..";
import verifyPeer from "../utils/verifyPeer";
import { ServersMessage } from "../types/message";

export default function handleServers(
  this: ToolDb,
  message: ServersMessage,
  remotePeerId: string
) {
  message.servers.forEach((peer) => {
    const verified = verifyPeer(this, peer);

    // Add this peer to our list of peers
    if (verified) {
      const filteredPeers = this.peers.findIndex(
        (p) => p.adress === peer.adress
      );
      if (filteredPeers === -1) {
        // Add this peer to the list
        this.peers.push(peer);
      }
    }
  });
}
