import { ToolDb, CrdtGetMessage, CrdtPutMessage, isCrdtData } from "..";

export default function handleCrdtGet(
  this: ToolDb,
  message: CrdtGetMessage,
  remotePeerId: string
) {
  this.store
    .get(message.key)
    .then((data) => {
      const parsed = JSON.parse(data);
      // Legacy (unsigned) CRDT documents are treated as not found
      if (!isCrdtData(parsed)) throw new Error("Not a CRDT document");

      // Use the id of the get so the other client knows we are replying
      const oldData: CrdtPutMessage = {
        type: "crdtPut",
        data: parsed,
        to: [],
        id: message.id,
      };
      this.network.sendToClientId(remotePeerId, oldData, false);
    })
    .catch((e) => {
      const finalMessage: CrdtGetMessage = {
        ...message,
        to: [...message.to, remotePeerId],
      };

      this.logger("Local key not found, relay", JSON.stringify(finalMessage));
      this.network.sendToAll(finalMessage, false);
    });
}
