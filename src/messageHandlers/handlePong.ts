import { ToolDb, verifyPeer, PongMessage } from "..";

export default function handlePong(
  this: ToolDb,
  message: PongMessage,
  remotePeerId: string
) {
  if (!this.isConnected) {
    this.isConnected = true;
    this.onConnect();
  }

  message.servers.forEach((peer) => {
    verifyPeer(this, peer).then((verified) => {
      // Verify integrity and topic
      if (verified && peer.topic === this.options.topic) {
        // Add this peer to our list of peers
        const filteredPeers = this.serverPeers.filter(
          (p) => p.address !== peer.address
        );
        if (filteredPeers.length === 0 && peer.host && peer.port) {
          // Add this peer to the list
          this.serverPeers.push(peer);
        }
      }
    });
  });

  this.onPeerConnect(this.peerAccount.getAddress() || "");
}
