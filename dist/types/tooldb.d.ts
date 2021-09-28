export interface ToolDbOptions {
    db: string;
    debug: boolean;
    peers: string[];
    maxRetries: number;
    wait: number;
    pow: 0;
    server: boolean;
    port: number;
}
