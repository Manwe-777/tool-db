import axios from "axios";
import { verifyMessage } from ".";
import ToolDbClient from "./toolDbClient";
import { GraphEntryValue } from "./types/graph";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
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
    const finalKey = userNamespaced ? `~${this.user?.pubKey}.${key}` : key;

    axios
      .get<GraphEntryValue<T>>(`${this.host}/api/get?key=${finalKey}`, {
        timeout: timeoutMs,
      })
      .then((value) => {
        if (value.data === null) resolve(null);
        else {
          return verifyMessage<T>(value.data)
            .then(() => {
              resolve(value.data.value);
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}
