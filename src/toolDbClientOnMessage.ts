import {
  CrdtMessage,
  PongMessage,
  textRandom,
  ToolDbMessage,
  uint8ToBase64,
  VerifyResult,
} from ".";
import ToolDb from "./tooldb";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import Automerge from "automerge";
import base64ToBinaryChange from "./utils/base64ToBinaryChange";

export default function toolDbClientOnMessage(
  this: ToolDb,
  data: string,
  socket: any // Hm browser websocket types??
): Promise<void> {
  const loadCrdtDocument = (
    key: string,
    doDefault = true
  ): Promise<Automerge.FreezeObject<any> | null> => {
    return new Promise((resolve, reject) => {
      if (this.documents[key]) {
        resolve(this.documents[key]);
      } else {
        this.store.get(`${key}.crdt`, (err, data: string) => {
          let currentDoc = null;
          if (!err) {
            // De-serealize stored crdt document
            // console.log("data", typeof data, data);
            const split = data.split(",");
            const loaded = new Uint8Array(split.length);
            split.forEach((s, i) => {
              loaded[i] = parseInt(s);
            });
            currentDoc = Automerge.load(loaded as any);
          } else {
            if (doDefault) {
              currentDoc = Automerge.init();
            }
          }

          resolve(currentDoc);
        });
      }
    });
  };

  return new Promise((resolve, reject) => {
    if (typeof data === "string") {
      const message: ToolDbMessage = JSON.parse(data);
      console.log("toolDbClientOnMessage", message);

      // Check if we are listening for this ID
      if (message.id) {
        const msgId = message.id;
        if (this._idListeners[msgId]) {
          this._idListeners[msgId](message);
          this.removeIdListener(msgId);
        }
      }

      if (message.type === "ping") {
        socket.send(
          JSON.stringify({
            type: "pong",
            id: message.id,
          } as PongMessage)
        );
      }

      if (message.type === "subscribe") {
        this.addKeyListener(message.key, (msg) => {
          if (msg.type === "put" || msg.type === "crdt") {
            socket.send(JSON.stringify(msg));
          }
        });

        // basically the exact same as GET, below
        this.store.get(message.key, (err, data) => {
          if (!err) {
            const oldData = { ...JSON.parse(data), id: message.id };
            socket.send(JSON.stringify(oldData));
          }
        });

        loadCrdtDocument(message.key, false).then((doc) => {
          if (doc) {
            const savedDoc = Automerge.save(doc);
            const msg: CrdtMessage = {
              type: "crdt",
              key: message.key,
              id: textRandom(10),
              doc: uint8ToBase64(savedDoc),
            };
            socket.send(JSON.stringify(msg));
          }
        });
      }

      if (message.type === "get") {
        this.store.get(message.key, (err, data) => {
          if (!err) {
            // Use the id of the get so the other client knows we are replying
            const oldData = { ...JSON.parse(data), id: message.id };
            socket.send(JSON.stringify(oldData));
          } else {
            // socket.send(data);
          }
        });
      }

      if (message.type === "put") {
        toolDbVerificationWrapper.call(this, message).then((value) => {
          if (value === VerifyResult.Verified) {
            const key = message.k;
            this._keyListeners.forEach((listener) => {
              if (listener?.key === key) {
                listener.timeout = setTimeout(
                  () => listener.fn(message),
                  100
                ) as any;
              }
            });

            this.store.put(message.k, JSON.stringify(message), (err, data) => {
              //
            });
          } else {
            console.log("unverified message", value, message);
          }
        });
      }

      if (message.type === "crdtPut") {
        // key = aggregated, final value
        // key.crdt = automerge doc with changes
        toolDbVerificationWrapper.call(this, message).then((value) => {
          if (value === VerifyResult.Verified) {
            const key = message.k;
            const data: string[] = JSON.parse(message.v);
            const changes = data.map(base64ToBinaryChange);

            loadCrdtDocument(key).then((currentDoc) => {
              const [newDoc, patch] = Automerge.applyChanges(
                currentDoc || Automerge.init(),
                changes
              );

              // persist
              this.documents[key] = newDoc;
              const savedDoc = Automerge.save(newDoc);
              this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
                //
              });

              this._keyListeners.forEach((listener) => {
                if (listener?.key === key) {
                  listener.fn({
                    type: "crdt",
                    key: key,
                    id: message.id,
                    doc: uint8ToBase64(savedDoc),
                  });
                }
              });
            });
          } else {
            console.log("unverified message", value, message);
          }
        });
      }

      if (message.type === "crdtGet") {
        loadCrdtDocument(message.key).then((currentDoc) => {
          const saved = Automerge.save(currentDoc || Automerge.init());
          socket.send(
            JSON.stringify({
              type: "crdt",
              id: message.id,
              key: message.key,
              doc: uint8ToBase64(saved),
            } as CrdtMessage)
          );
        });
      }

      if (message.type === "crdt") {
        const key = message.key;
        this._keyListeners.forEach((listener) => {
          if (listener?.key === key) {
            listener.timeout = setTimeout(
              () => listener.fn(message),
              100
            ) as any;
          }
        });
      }
    }
  });
}
