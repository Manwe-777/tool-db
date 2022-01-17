import Automerge from "automerge";
import { CrdtGetMessage, CrdtMessage, ToolDb, uint8ToBase64 } from "..";

export default function handleCrdtGet(
  this: ToolDb,
  message: CrdtGetMessage,
  remotePeerId: string
) {
  this.loadCrdtDocument(message.key, false).then((currentDoc) => {
    if (currentDoc) {
      const saved = Automerge.save(currentDoc || Automerge.init());
      this.network.sendToClientId(remotePeerId, {
        type: "crdt",
        id: message.id,
        key: message.key,
        to: [],
        doc: uint8ToBase64(saved),
      } as CrdtMessage);
    } else {
      if (this.options.debug) {
        console.log("Local key not found, relay", JSON.stringify(message));
      }
      this.network.sendToAll(message, false, true);
    }
  });
}
