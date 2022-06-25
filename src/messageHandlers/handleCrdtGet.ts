import { ToolDb } from "..";
import { CrdtGetMessage, CrdtPutMessage } from "../types/message";

export default function handleCrdtGet(
  this: ToolDb,
  message: CrdtGetMessage,
  remotePeerId: string
) {
  this.emit("crdtget", message);
  this.store.get(message.key, (err, data) => {
    if (data) {
      try {
        // Use the id of the get so the other client knows we are replying
        const oldData = {
          type: "crdtPut",
          data: JSON.parse(data),
          to: [],
          id: message.id,
        } as CrdtPutMessage;
        this.network.sendToClientId(remotePeerId, oldData);
      } catch (e) {
        // socket.send(data);
        // do nothing
      }
    } else {
      this.logger("Local key not found, relay", JSON.stringify(message));
      this.network.sendToAll(message, false, true);
    }
  });
}
