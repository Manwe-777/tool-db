import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// tool-db is linked from ../packages and published as CommonJS, so it has to
// be pre-bundled and converted like a regular dependency
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["tool-db", "@tool-db/indexeddb-store"],
  },
  build: {
    commonjsOptions: {
      include: [/tool-db/, /node_modules/],
    },
  },
});
