import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";

export interface ToolDbOptions {
  db: string;
  debug: boolean;
  peers: string[];
  maxRetries: number;
  wait: number;
  pow: number;
  server: boolean;
  httpServer: HTTPServer | HTTPSServer | undefined;
  port: number;
}
