import ToolChain from ".";
import { MessagePut } from "./types/message";
export default function toolChainPut<T = any>(this: ToolChain, key: string, value: T, userNamespaced?: boolean): Promise<MessagePut | null>;
