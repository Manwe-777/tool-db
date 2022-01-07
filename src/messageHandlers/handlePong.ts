import { JoinMessage, PongMessage, signData, textRandom, ToolDb } from "..";
import { Peer } from "../types/tooldb";

export default function handlePong(
  this: ToolDb,
  message: PongMessage,
  remotePeerId: string
) {
  this.onConnect();

  if (this.options.server && this.options.privateKey) {
    const timestamp = new Date().getTime();

    // Should be an exact match of the verifyPeer function!
    const dataToSign = `${this.options.topic}-${timestamp}-${this.options.host}:${this.options.port}`;

    signData(dataToSign, this.options.privateKey).then((signature) => {
      const meAsPeer: Peer = {
        topic: this.options.topic,
        timestamp: timestamp,
        host: this.options.host,
        port: this.options.port,
        pubkey: this.options.id,
        sig: signature,
      };

      this.network.sendToClientId(remotePeerId, {
        type: "join",
        peer: meAsPeer,
        to: [],
        id: textRandom(10),
      } as JoinMessage);
    });
  }
}
