# ToolDB Chat

An end to end encrypted group chat built on ToolDB and Nostr.

- **Identity**: a Nostr key, created in the browser and saved encrypted
  with your password (NIP-49), an imported `nsec`, or a Nostr browser
  extension (NIP-07). Names come from Nostr profiles.
- **Groups**: the group (name and members) lives in the owner's namespace,
  so only the owner can change it.
- **Joining**: users ask to join with an invite link. Requests are a shared
  CRDT map where a custom verificator only lets users add themselves.
- **Encryption**: the owner shares the group key with each member using
  NIP-44, and messages are encrypted with the group key. Relays only see
  ciphertext.

See `src/chat.ts` for the data model.

## Run it

Build the packages first (from the repository root), then:

```bash
npm install
npm run relay   # a ToolDB relay node on ws://127.0.0.1:8080
npm run dev     # the app on http://localhost:5173
```

Use another browser profile (or another port, like `npx vite --port 5174`,
since storage is per origin) to chat as a second user.

Set `VITE_RELAYS` to use other relays, for example
`VITE_RELAYS=wss://relay.example.com,ws://127.0.0.1:8080 npm run dev`.
