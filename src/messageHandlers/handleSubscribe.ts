import Automerge from "automerge";
import {
  CrdtMessage,
  SubscribeMessage,
  textRandom,
  ToolDb,
  uint8ToBase64,
} from "..";

export default function handleSubscribe(
  this: ToolDb,
  message: SubscribeMessage,
  remotePeerId: string
) {
  if (remotePeerId) {
    const subId = remotePeerId + "-" + message.key;
    if (!this.subscriptions.includes(subId)) {
      this.subscriptions.push(subId);

      this.addKeyListener(message.key, (msg) => {
        if ((msg.type === "put" || msg.type === "crdt") && remotePeerId) {
          // We do not reply to the socket directly
          // instead we use the client id, in case the socket reconnects
          this.network.sendToClientId(remotePeerId, msg);
        }
      });
    }
  }

  // basically the exact same as GET, below
  this.store.get(message.key, (err, data) => {
    if (data) {
      try {
        const oldData = { ...JSON.parse(data), id: message.id };
        this.network.sendToClientId(remotePeerId, oldData);
      } catch (e) {
        // do nothing
      }
    }
  });

  this.loadCrdtDocument(message.key, false).then((doc) => {
    // console.log("Load crdt from subscribe", message.key, doc);
    if (doc) {
      const savedDoc = Automerge.save(doc);
      const msg: CrdtMessage = {
        type: "crdt",
        key: message.key,
        to: [],
        id: textRandom(10),
        doc: uint8ToBase64(savedDoc),
      };
      this.network.sendToClientId(remotePeerId, msg);
    }
  });
}
