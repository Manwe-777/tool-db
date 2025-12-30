# `@tool-db/webrtc-network`

WebRTC network adapter for tool-db with hybrid peer discovery using both WebTorrent trackers and Nostr relays.

## Features

- **Hybrid Peer Discovery**: Uses both WebTorrent trackers and Nostr relays for maximum connectivity
- **Mobile-Friendly**: Nostr relays provide more reliable peer discovery on mobile devices
- **Automatic Reconnection**: Exponential backoff reconnection for both trackers and relays
- **Configurable**: Custom relay URLs and enable/disable options

## Installation

```bash
npm install @tool-db/webrtc-network
```

## Usage

```typescript
import { ToolDb } from "tool-db";
import ToolDbWebrtc from "@tool-db/webrtc-network";
import ToolDbECDSA from "@tool-db/ecdsa-user";
import ToolDbIndexedDb from "@tool-db/indexeddb-store";

const db = new ToolDb({
  debug: true,
  networkAdapter: ToolDbWebrtc,
  storageAdapter: ToolDbIndexedDb,
  userAdapter: ToolDbECDSA,
  topic: "my-app",
});
```

## Configuration

### Custom Nostr Relays

You can provide custom Nostr relay URLs via the `modules.nostr` configuration:

```typescript
const db = new ToolDb({
  networkAdapter: ToolDbWebrtc,
  // ... other options
  modules: {
    nostr: {
      relayUrls: [
        "wss://relay.damus.io",
        "wss://nos.lol",
        "wss://relay.nostr.band",
      ],
    },
  },
});
```

### Disable Nostr

If you want to use only WebTorrent trackers (legacy behavior):

```typescript
const db = new ToolDb({
  networkAdapter: ToolDbWebrtc,
  // ... other options
  modules: {
    nostr: {
      enabled: false,
    },
  },
});
```

## Default Relay URLs

### WebTorrent Trackers
- `wss://tracker.webtorrent.dev`
- `wss://tracker.openwebtorrent.com`
- `wss://tracker.btorrent.xyz`
- `wss://tracker.files.fm:7073/announce`

### Nostr Relays
- `wss://nos.lol`
- `wss://relay.damus.io`
- `wss://nostr.data.haus`
- `wss://relay.nostromo.social`
- `wss://relay.fountain.fm`

## How It Works

1. **Initialization**: Generates a Nostr keypair for signing peer discovery events
2. **Announcement**: Announces presence to both WebTorrent trackers and Nostr relays
3. **Offer/Answer Exchange**: SDP offers and answers are exchanged via both channels
4. **WebRTC Connection**: Once signaling completes, direct WebRTC peer connections are established

The hybrid approach increases the chances of successful peer discovery, especially on mobile devices where WebTorrent tracker connections may be less reliable.
