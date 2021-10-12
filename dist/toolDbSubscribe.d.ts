import ToolDb from "./tooldb";
/**
 * Subscribe to all PUT updates for this key.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data>
 */
export default function toolDbSubscribe<T = any>(this: ToolDb, key: string, userNamespaced?: boolean): Promise<void>;
