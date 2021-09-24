import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";
export default function toolDbClientOnMessage(this: ToolDb, message: ToolDbMessage, socket: any): Promise<void>;
