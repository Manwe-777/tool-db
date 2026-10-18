# `@tool-db/redis-store`

Redis storage adapter for ToolDB, for Node.

It connects to the default Redis server (`redis://localhost:6379`), and all
instances share the same keyspace, so use separate Redis servers or
databases for separate stores.
