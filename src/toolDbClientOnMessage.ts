import {
  base64ToBinaryDocument,
  CrdtMessage,
  PongMessage,
  PutMessage,
  QueryAckMessage,
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
  remotePeerId: string
) {
  const originalData = data;
  if (typeof data === "string") {
    try {
      const message: ToolDbMessage = JSON.parse(data);
      // console.warn(
      //   "Got message > ",
      //   message.type,
      //   (message as any).k || "",
      //   message
      // );

      // Check if we are listening for this ID
      if (message.id) {
        const msgId = message.id;
        if (this._idListeners[msgId]) {
          this._idListeners[msgId](message);
          this.removeIdListener(msgId);
        }
      }

      if (message.type === "ping") {
        this.websockets.sendToClientId(remotePeerId || "", {
          type: "pong",
          isServer: this.options.server,
          clientId: this.options.id,
          to: [],
          id: textRandom(10),
        } as PongMessage);
      }

      if (message.type === "pong") {
        this.onConnect();
      }

      if (message.type === "subscribe") {
        if (remotePeerId) {
          const subId = remotePeerId + "-" + message.key;
          if (!this.subscriptions.includes(subId)) {
            this.subscriptions.push(subId);

            this.addKeyListener(message.key, (msg) => {
              if ((msg.type === "put" || msg.type === "crdt") && remotePeerId) {
                // We do not reply to the socket directly
                // instead we use the client id, in case the socket reconnects
                this.websockets.sendToClientId(remotePeerId, msg);
              }
            });
          }
        }

        // basically the exact same as GET, below
        this.store.get(message.key, (err, data) => {
          if (data) {
            try {
              const oldData = { ...JSON.parse(data), id: message.id };
              this.websockets.sendToClientId(remotePeerId || "", oldData);
            } catch (e) {
              // do nothing
            }
          }
        });

        this.loadCrdtDocument(message.key, false).then((doc) => {
          // console.log("Load crdt from subscribe", message.key, doc);
          if (doc) {
            const savedDoc = Automerge.save(doc);
            // console.log("saved", savedDoc);
            const msg: CrdtMessage = {
              type: "crdt",
              key: message.key,
              to: [],
              id: textRandom(10),
              doc: uint8ToBase64(savedDoc),
            };
            this.websockets.sendToClientId(remotePeerId || "", msg);
          }
        });
      }

      if (message.type === "get") {
        this.store.get(message.key, (err, data) => {
          if (data) {
            try {
              // Use the id of the get so the other client knows we are replying
              const oldData = {
                type: "put",
                ...JSON.parse(data),
                id: message.id,
              } as PutMessage;
              this.websockets.sendToClientId(remotePeerId || "", oldData);
            } catch (e) {
              // socket.send(data);
              // do nothing
            }
          } else {
            if (this.options.debug) {
              console.log("Local key not found, relay", originalData);
            }
            this.websockets.send(message);
          }
        });
      }

      if (message.type === "put") {
        toolDbVerificationWrapper.call(this, message).then((value) => {
          // console.log("Verification wrapper result: ", value, message.k);
          if (value === VerifyResult.Verified) {
            // relay to other servers !!!
            this.websockets.send(message, true);

            this.store.get(message.k, (err, oldData: string) => {
              if (oldData) {
                const parsedOldData: PutMessage = {
                  type: "put",
                  ...JSON.parse(oldData),
                };
                if (parsedOldData.t < message.t) {
                  const key = message.k;
                  this.triggerKeyListener(key, message);
                  this.store.put(
                    message.k,
                    JSON.stringify(message),
                    (err, data) => {
                      //
                    }
                  );
                } else {
                  const key = message.k;
                  this.triggerKeyListener(key, parsedOldData);
                }
                // } else if (this.options.debug) {
                //   console.log(
                //     `${message.k} has old data, but its newer. old ${parsedOldData.t} < new ${message.t}`
                //   );
                // }
              } else {
                const key = message.k;
                this.triggerKeyListener(key, message);
                this.store.put(
                  message.k,
                  JSON.stringify(message),
                  (err, data) => {
                    //
                  }
                );
              }
            });
          } else {
            console.warn("unverified message: ", value, message);
          }
        });
      }

      if (message.type === "crdtPut") {
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
              //     Automerge.getHistory(newDoc)
              //   );
              // }

              // persist
              this.documents[key] = newDoc;
              const savedDoc = Automerge.save(newDoc);
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
              this.websockets.send(crdtMessage, true);
            });
          } else {
            console.log("unverified message", value, message);
          }
        });
      }

      if (message.type === "crdtGet") {
        this.loadCrdtDocument(message.key).then((currentDoc) => {
          const saved = Automerge.save(currentDoc || Automerge.init());
          this.websockets.sendToClientId(remotePeerId || "", {
            type: "crdt",
            id: message.id,
            key: message.key,
            to: [],
            doc: uint8ToBase64(saved),
          } as CrdtMessage);
        });
      }

      if (message.type === "query") {
        this.store.query(message.key).then((keys) => {
          this.websockets.sendToClientId(remotePeerId || "", {
            type: "queryAck",
            id: message.id,
            to: [],
            keys,
          } as QueryAckMessage);
        });
      }

      if (message.type === "crdt") {
        const key = message.key;
        this.triggerKeyListener(key, message);

        const savedDoc = base64ToBinaryDocument(message.doc);
        this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
          //
        });
      }
    } catch (e) {
      console.log("Got message ERR > ", data);
      console.log(e);
    }
  }
}
