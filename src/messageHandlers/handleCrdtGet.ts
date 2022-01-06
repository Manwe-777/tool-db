import Automerge from "automerge";
import { CrdtGetMessage, CrdtMessage, ToolDb, uint8ToBase64 } from "..";

export default function handleCrdtGet(
  this: ToolDb,
  message: CrdtGetMessage,
  remotePeerId: string
) {
  this.loadCrdtDocument(message.key).then((currentDoc) => {
    const saved = Automerge.save(currentDoc || Automerge.init());
    this.websockets.sendToClientId(remotePeerId, {
      type: "crdt",
      id: message.id,
      key: message.key,
      to: [],
      doc: uint8ToBase64(saved),
    } as CrdtMessage);
  });
}
