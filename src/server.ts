import { ToolDb } from ".";

console.log("Starting server..");
const server = new ToolDb({
  port: 8080,
  server: true,
});
