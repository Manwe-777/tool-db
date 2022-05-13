import { ToolDb } from "..";
import { SubscribeMessage } from "../types/message";

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
        if ((msg.type === "put" || msg.type === "crdtPut") && remotePeerId) {
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
}
