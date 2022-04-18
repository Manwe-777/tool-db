import Automerge from "automerge";
import { ToolDb } from "..";
import { CrdtMessage, CrdtGetMessage } from "../types/message";
import uint8ArrayToHex from "../utils/encoding/uint8ArrayToHex";

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
        doc: uint8ArrayToHex(saved),
      } as CrdtMessage);
    } else {
      if (this.options.debug) {
        console.log("Local key not found, relay", JSON.stringify(message));
      }
      this.network.sendToAll(message, false, true);
    }
  });
}
