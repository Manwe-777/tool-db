import ToolDb from "./tooldb";
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbGet<T = any>(this: ToolDb, key: string, userNamespaced?: boolean, timeoutMs?: number): Promise<T | null>;
