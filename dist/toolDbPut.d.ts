import { PutMessage } from ".";
import ToolDb from "./tooldb";
/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data | null>
 */
export default function toolDbPut<T = any>(this: ToolDb, key: string, value: T, userNamespaced?: boolean): Promise<PutMessage | null>;
