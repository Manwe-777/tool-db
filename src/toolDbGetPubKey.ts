import ToolDbClient from "./toolDbClient";
import encodeKeyString from "./utils/crypto/encodeKeyString";
import exportKey from "./utils/crypto/exportKey";

export default function toolChainGetPubKey(this: ToolDbClient) {
  if (!this.user?.keys.signKeys.publicKey) {
    return Promise.reject(new Error("You are not authorized yet."));
  }

  return exportKey("spki", this.user.keys.signKeys.publicKey).then((skpub) =>
    encodeKeyString(skpub as ArrayBuffer)
  );
}
