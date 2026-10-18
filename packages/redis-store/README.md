# `@tool-db/redis-store`

Redis storage adapter for ToolDB, for Node.

```js
import ToolDbRedis, { redisStore } from "@tool-db/redis-store";

// The default local server (redis://localhost:6379)
new ToolDb({ storageAdapter: ToolDbRedis, storageName: "my-app" });

// Another server
new ToolDb({
  storageAdapter: redisStore("redis://user:password@host:6379/0"),
  storageName: "my-app",
});
```

Keys are prefixed with the storage name, so several stores can share a
server.
