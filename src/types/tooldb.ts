export interface ToolDbOptions {
  db: string;
  debug: boolean;
  peers: string[];
  maxRetries: number;
  wait: number;
  pow: number;
  server: boolean;
  port: number;
}
