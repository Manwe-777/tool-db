# `tool-db-hybrid`

The Hybrid network adapter is a mix between bitorrent's tracker-based peer discovery and regular websockets client-server structure.

We use trackers to announce the server via a given name (like a domain or hostname), then clients on a web browser can search for the needed metadata to reach out those servers in the trackers, like a DNS system.

The goal is to be able to reach for any server, anywhere, without going trough censorable channels, removing the most usual points of failure for hosts and allowing servers to move between regions seamlessly, or even having multiple replicas and backups hosted at many places at once.

# Future work

Once we identify servers by name we can do all sorts of network schemas, but the most interesting is federations, where clients can choose where to store their data, sign up at those servers and point other users to where their data is stored; Simply using a name like a domain, without caring much about where the server is hosted.

For that to work, document keys should point to a specific server like a route;

`manwe-server@:UWGbJslRlXmm5Yi4Ah0x4AlP6na3HEcIhJ7BN-fTCLQHJRQNOSCAG6twTdZ_9VqbWuAZNWaq-ZXrY_A7J64Eyo.data`

This, however, should only affect the routing of messages towards specific peers, but not the keys or data itself, so the recieving server will not be awake or the server name portion of the key when recieving it, this way we also allow compatibility between different tooldb modules.