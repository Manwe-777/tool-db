import ToolDbClient from "./toolDbClient";
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
 * @returns Promise<Data>
 */
export default function toolChainGet<T = any>(this: ToolDbClient, key: string, userNamespaced?: boolean, timeoutMs?: number): Promise<T>;
