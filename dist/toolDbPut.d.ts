import toolDbClient from "./toolDbClient";
import { GraphEntryValue } from "./types/graph";
export default function toolDbPut<T = any>(this: toolDbClient, key: string, value: T, userNamespaced?: boolean): Promise<GraphEntryValue | null>;
