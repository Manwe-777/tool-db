import { ToolDb } from "tool-db";

export default function getToolDb(): ToolDb {
  return (window as any).toolDb;
}
