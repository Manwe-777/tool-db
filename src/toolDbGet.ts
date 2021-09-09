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
  timeoutMs = 3000
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

    let first = true;
    this.gun.get(finalKey, (ack: any) => {
      if (ack["@"] || ack.put) {
        const d = ack.put;
        if ((d && first) || (d && !first)) {
          if (!d.v) {
            resolve(null);
          } else {
            try {
              const data = JSON.parse(d.v);
              resolve(data.value);
            } catch (e) {
              console.error(e);
              resolve(null);
            }
          }
        }
        if (!d && !first) {
          resolve(null);
        }
        first = false;
      }
    });
  });
}
