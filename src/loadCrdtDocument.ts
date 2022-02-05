import { ToolDb } from ".";
import Automerge from "automerge";
import hexToUint8 from "./utils/encoding/hexToUint8";

export default function loadCrdtDocument(
  this: ToolDb,
  key: string,
  doDefault = true
): Promise<Automerge.FreezeObject<any> | null> {
  return new Promise((resolve, reject) => {
    if (this.documents[key]) {
      resolve(this.documents[key]);
    } else {
      this.store.get(`${key}.crdt`, (err, data) => {
        let currentDoc = null;
        // console.warn(err, data);
        if (data) {
          // De-serealize stored crdt document
          // console.log("data", typeof data, data);
          const loaded = hexToUint8(data);

          currentDoc = Automerge.load(loaded as any);
          // console.log("CRDT LOADED", key, currentDoc);
        } else {
          // console.log("CRDT not found for", key);
          if (doDefault) {
            currentDoc = Automerge.init();
          }
        }

        resolve(currentDoc);
      });
    }
  });
}
