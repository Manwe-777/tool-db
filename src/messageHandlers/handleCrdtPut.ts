import Automerge from "automerge";
import {
  base64ToBinaryChange,
  CrdtMessage,
  CrdtPutMessage,
  ToolDb,
  uint8ToBase64,
  VerifyResult,
} from "..";
import toolDbVerificationWrapper from "../toolDbVerificationWrapper";

export default function handleCrdtPut(
  this: ToolDb,
  message: CrdtPutMessage,
  remotePeerId: string
) {
  // key = aggregated, final value
  // key.crdt = automerge doc with changes
  // const writeStart = new Date().getTime();
  toolDbVerificationWrapper.call(this, message).then((value) => {
    // console.log("CRDT Verification wrapper result: ", value);
    if (value === VerifyResult.Verified) {
      const key = message.k;
      let data: string[] = [];
      try {
        data = JSON.parse(message.v);
      } catch (e) {
        //
      }
      const changes = data.map(base64ToBinaryChange);

      this.loadCrdtDocument(key).then((currentDoc) => {
        // if (currentDoc) {
        //   console.log(
        //     "loaded",
        //     key,
        //     currentDoc,
        //     Automerge.getHistory(currentDoc)
        //   );
        // }

        let newDoc = Automerge.init();
        try {
          [newDoc] = Automerge.applyChanges(
            currentDoc || Automerge.init(),
            changes
          );
        } catch (e) {
          try {
            [newDoc] = Automerge.applyChanges(Automerge.init(), changes);
          } catch (ee) {
            if (this.options.debug) {
              console.log(ee);
            }
          }
        }

        // if (newDoc) {
        //   console.log(
        //     "new document changes:",
        //     Automerge.getHistory(newDoc),
        //     "final: ",
        //     newDoc
        //   );
        // }

        // persist
        this.documents[key] = newDoc;

        // OOHH THE TYPECAST PAIN
        // This works but the hacking is awful, we need a better solution for storing the crdts
        const savedDoc = Automerge.save(newDoc) as any;
        this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
          // const writeEnd = new Date().getTime();
          // console.log("CRDT write: ", (writeEnd - writeStart) / 1000);
        });

        const crdtMessage: CrdtMessage = {
          type: "crdt",
          key: key,
          id: message.id,
          to: [],
          doc: uint8ToBase64(savedDoc),
        };
        this.triggerKeyListener(key, crdtMessage);

        // relay to other servers
        // !!!
        this.network.sendToAll(crdtMessage, true);
      });
    } else {
      console.log("unverified message", value, message);
    }
  });
}
