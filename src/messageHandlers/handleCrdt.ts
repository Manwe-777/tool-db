import { base64ToBinaryDocument, CrdtMessage, ToolDb } from "..";

export default function handleCrdt(
  this: ToolDb,
  message: CrdtMessage,
  remotePeerId: string
) {
  const key = message.key;
  this.triggerKeyListener(key, message);

  // OOHH THE TYPECAST PAIN
  // This works but the hacking is awful, we need a better solution for storing the crdts
  const savedDoc = base64ToBinaryDocument(message.doc) as any;
  this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
    //
  });
}
