import { ToolDb } from "..";
import { GetMessage, PutMessage } from "../types/message";

export default function handleGet(
  this: ToolDb,
  message: GetMessage,
  remotePeerId: string
) {
  this.store
    .get(message.key)
    .then((data) => {
      try {
        // Use the id of the get so the other client knows we are replying
        const oldData = {
          type: "put",
          data: JSON.parse(data),
          to: [],
          id: message.id,
        } as PutMessage;
        this.network.sendToClientId(remotePeerId, oldData);
      } catch (e) {
        // socket.send(data);
        // do nothing
      }
    })
    .catch((e) => {
      this.logger("Local key not found, relay", JSON.stringify(message));
      this.network.sendToAll(message, false, true);
    });
}
