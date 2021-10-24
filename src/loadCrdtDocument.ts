import { ToolDb } from ".";
import Automerge from "automerge";

export default function loadCrdtDocument(
  this: ToolDb,
  key: string,
  doDefault = true
): Promise<Automerge.FreezeObject<any> | null> {
  return new Promise((resolve, reject) => {
    if (this.documents[key]) {
      resolve(this.documents[key]);
    } else {
      this.store.get(`${key}.crdt`, (err, data: unknown) => {
        let currentDoc = null;
        if (data) {
          // De-serealize stored crdt document
          // console.log("data", typeof data, data);
          let loaded = data as Uint8Array;
          if (typeof data === "string") {
            const split = data.split(",");
            loaded = new Uint8Array(split.length);

            split.forEach((s, i) => {
              loaded[i] = parseInt(s);
            });
          }
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
