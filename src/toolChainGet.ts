import ToolChainClient from "./toolChainClient";
import axios from "axios";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
 * @returns Promise<Data>
 */
export default function toolChainGet<T = any>(
  this: ToolChainClient,
  key: string,
  userNamespaced = false,
  timeoutMs = 3000
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.pubKey === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `~${this.user?.pubKey}.${key}` : key;

    axios
      .get<T>(this.host + "/api/get?key=" + finalKey, {
        timeout: timeoutMs,
      })
      .then((value) => {
        resolve(value.data);
      })
      .catch(reject);
  });
}
