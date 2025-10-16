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
    // Check for duplicates first (synchronously) to avoid race conditions
    const filteredPeers = this.serverPeers.filter(
      (p) => p.address === peer.address
    );
    
    if (filteredPeers.length === 0 && peer.host && peer.port) {
      verifyPeer(this, peer).then((verified) => {
        // Verify integrity and topic
        if (verified && peer.topic === this.options.topic) {
          // Double-check for duplicates after async verification
          const recheck = this.serverPeers.filter(
            (p) => p.address === peer.address
          );
          if (recheck.length === 0) {
            // Add this peer to the list
            this.serverPeers.push(peer);
          }
        }
      });
    }
  });

  this.onPeerConnect(this.peerAccount.getAddress() || "");
}
