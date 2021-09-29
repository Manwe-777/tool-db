import ToolDbClient from "./toolDbClient";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbGet<T = any>(
  this: ToolDbClient,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.pubKey === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.user?.pubKey}.${key}` : key;
    if (this.debug) {
      console.log("GET > " + finalKey);
    }

    let hasData = false;
    let data: T | null = null;

    let timeout = setTimeout(() => {
      resolve(data);
    }, timeoutMs);

    this.gun.get(finalKey, (ack: any) => {
      if (ack["@"] || ack.put) {
        // console.log("ACK", ack);
        if (ack.put && ack.put.v) {
          try {
            const recv = JSON.parse(ack.put.v);
            hasData = true;
            data = recv.value;
          } catch (e) {
            console.error(e);
          }
        }

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          resolve(data);
        }, timeoutMs);
      }
    });
  });
}
