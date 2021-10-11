import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";
export default function toolDbClientOnMessage(this: ToolDb, data: ToolDbMessage, socket: any): Promise<void>;
