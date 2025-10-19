# ToolDb Collaborative Demo

This demo showcases the powerful CRDT (Conflict-free Replicated Data Types) capabilities of ToolDb in a real-time collaborative application.

## Features Demonstrated

### 🔄 CRDTs (Conflict-free Replicated Data Types)

- **Counter CRDT**: Real-time collaborative counter with add/subtract operations
- **List CRDT**: Collaborative todo list with add/delete operations
- **Map CRDT**: Collaborative key-value store with set/delete operations

### 🌐 P2P Network

- WebRTC peer-to-peer connections
- Real-time synchronization across multiple clients
- No central server required

### 🔐 Cryptographic Security

- ECDSA digital signatures
- Message verification
- Anonymous authentication

### 💾 Persistent Storage

- IndexedDB local storage
- Offline-first architecture
- Data persistence across sessions

## How to Use

1. **Start the demo**:

   ```bash
   npm run dev
   ```

2. **Open multiple browser tabs** to the demo URL (usually `http://localhost:3000`)

3. **Test real-time collaboration**:

   - Modify the counter in one tab and see it update in others
   - Add/remove todos and watch them sync across tabs
   - Add key-value pairs and see them appear everywhere

4. **Try offline mode**:
   - Disconnect your internet
   - Continue making changes
   - Reconnect and see everything sync automatically

## Technical Implementation

The demo uses three main ToolDb CRDT types:

### CounterCrdt

```typescript
const counter = new CounterCrdt(userAddress);
counter.ADD(5); // Add 5 to counter
counter.SUB(2); // Subtract 2 from counter
```

### ListCrdt

```typescript
const list = new ListCrdt(userAddress);
list.PUSH("New item"); // Add item to end
list.DEL(0); // Delete item at index 0
```

### MapCrdt

```typescript
const map = new MapCrdt(userAddress);
map.SET("key", "value"); // Set key-value pair
map.DEL("key"); // Delete key
```

## Architecture

- **Frontend**: Next.js with React and Tailwind CSS
- **P2P Network**: WebRTC for peer-to-peer connections
- **Storage**: IndexedDB for local persistence
- **Authentication**: ECDSA for cryptographic signatures
- **CRDTs**: Conflict-free replicated data types for real-time sync

## Key Benefits

1. **No Server Required**: Fully peer-to-peer, no central infrastructure
2. **Real-time Sync**: Changes appear instantly across all connected clients
3. **Offline Support**: Works without internet connection
4. **Conflict Resolution**: CRDTs automatically resolve conflicts
5. **Cryptographic Security**: All data is cryptographically signed and verified
6. **Persistent**: Data survives browser restarts and offline periods

This demo perfectly illustrates how ToolDb enables building truly decentralized, collaborative applications with strong consistency guarantees and cryptographic security.
